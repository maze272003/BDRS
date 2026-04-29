<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use Carbon\Carbon;
use Illuminate\Support\Str;
use PhpOffice\PhpWord\TemplateProcessor;

class DocumentGenerationController extends Controller
{
    /**
     * Generate a Word document and update the request status.
     */
    public function generate(DocumentRequest $documentRequest)
    {
        $documentType = $documentRequest->documentType;

        if (!$documentType) {
            return back()->with('error', 'The document request is missing a document type.');
        }

        $profile = $documentRequest->user?->profile;

        if (!$profile) {
            return back()->with('error', 'Generation failed: The user has not completed their profile information.');
        }

        // --- Prepare data for the template ---
        $requestData = $documentRequest->form_data ?? [];

        if (is_string($requestData)) {
            $requestData = json_decode($requestData, true) ?? [];
        }

        $documentTypeOriginalName = trim($documentType->name);
        $documentTypeName = strtolower($documentTypeOriginalName);

        // Helper: return first non-empty value
        $firstFilled = function (...$values) {
            foreach ($values as $value) {
                if (!is_null($value) && trim((string) $value) !== '') {
                    return $value;
                }
            }

            return 'N/A';
        };

        // Build full address from profile table
        $profileAddress = collect([
            $profile->street_address ?? null,
            $profile->barangay ?? null,
            $profile->city ?? null,
            $profile->province ?? null,
        ])
            ->filter(function ($value) {
                return !is_null($value) && trim((string) $value) !== '';
            })
            ->implode(', ');

        $fullAddress = $firstFilled(
            $profile->full_address ?? null,
            $profileAddress
        );

        $isResidency = str_contains($documentTypeName, 'residency');

        if ($isResidency && empty($requestData['signature_path'])) {
            return back()->with('error', 'Generation failed: The signature is missing from this document request.');
        }

        // --- Template Selection Logic ---
        $isEdukDocument =
            str_contains($documentTypeName, 'eduk') ||
            str_contains($documentTypeName, 'pagpapatunay');

        $isOathDocument =
            str_contains($documentTypeName, 'oath') ||
            str_contains($documentTypeName, 'undertaking');

        $isBusinessPermit =
            str_contains($documentTypeName, 'business') &&
            str_contains($documentTypeName, 'permit');

        if ($isEdukDocument) {
            $templateName = 'pagpapatunay_eduk.docx';
        } elseif ($isOathDocument) {
            $templateName = 'oath_of_undertaking.docx';
        } else {
            $templateName = Str::snake($documentTypeName) . '_template.docx';
        }

        $templatePath = storage_path("app/templates/{$templateName}");

        if (!file_exists($templatePath)) {
            return back()->with('error', "Template file not found: {$templateName}");
        }

        $templateProcessor = new TemplateProcessor($templatePath);

        // --- Prepare and Set Common Values ---
        $nameParts = array_filter([
            $profile->first_name ?? null,
            $profile->middle_name ?? null,
            $profile->last_name ?? null,
        ]);

        $fullName = strtoupper(implode(' ', $nameParts));

        $templateProcessor->setValue('FULL_NAME', $fullName);
        $templateProcessor->setValue('AGE', $profile->birthday ? Carbon::parse($profile->birthday)->age : 'N/A');
        $templateProcessor->setValue('ADDRESS', $fullAddress);
        $templateProcessor->setValue('DAY', date('jS'));
        $templateProcessor->setValue('MONTH_YEAR', date('F Y'));
        $templateProcessor->setValue('CURRENT_DATE', date('F j, Y'));

        /*
        |--------------------------------------------------------------------------
        | Business Permit Values
        |--------------------------------------------------------------------------
        | If business_address is missing from form_data, it will use the address
        | from the resident profile: street_address, barangay, city, province.
        |--------------------------------------------------------------------------
        */
        if ($isBusinessPermit) {
            $businessName = $firstFilled(
                $requestData['business_name'] ?? null,
                $requestData['businessName'] ?? null,
                $requestData['BUSINESS_NAME'] ?? null
            );

            $businessAddress = $firstFilled(
                $requestData['business_address'] ?? null,
                $requestData['businessAddress'] ?? null,
                $requestData['BUSINESS_ADDRESS'] ?? null,
                $requestData['business_location'] ?? null,
                $requestData['businessLocation'] ?? null,
                $requestData['address'] ?? null,
                $fullAddress
            );

            $templateProcessor->setValue('BUSINESS_NAME', $businessName);
            $templateProcessor->setValue('BUSINESS_ADDRESS', $businessAddress);
        }

        // --- SET DOCUMENT-SPECIFIC VALUES ---
        switch ($documentTypeOriginalName) {
            case 'Pagpapatunay Eduk':
                $templateProcessor->setValue('SCHOOL_NAME', $requestData['school_name'] ?? 'N/A');
                $templateProcessor->setValue('SCHOOL_ADDRESS', $requestData['school_address'] ?? 'N/A');
                $templateProcessor->setValue('COURSE_PROGRAM', $requestData['course_program'] ?? 'N/A');
                $templateProcessor->setValue('YEAR_LEVEL', $requestData['year_level'] ?? 'N/A');
                $templateProcessor->setValue('ACADEMIC_YEAR', $requestData['academic_year'] ?? 'N/A');
                $templateProcessor->setValue('PURPOSE', $requestData['purpose'] ?? 'N/A');
                break;

            case 'Oath of Undertaking':
                $templateProcessor->setValue('PURPOSE', $requestData['purpose'] ?? 'N/A');
                $templateProcessor->setValue('SPECIFIC_UNDERTAKING', $requestData['specific_undertaking'] ?? 'N/A');
                break;

            case 'Mayors Business Permit':
            case 'Mayor Business Permit':
            case 'BRGY Business Permit':
            case 'Brgy Business Permit':
            case 'Barangay Business Permit':
                // Already handled by the flexible $isBusinessPermit block above.
                break;

            case 'Job Seeker':
                $templateProcessor->setValue('YEARS_QUALIFIED', $requestData['years_qualified'] ?? 'N/A');
                break;

            case 'pwd':
            case 'PWD':
                $disability = $requestData['disability_type'] ?? 'Not Specified';

                if ($disability === 'Others') {
                    $disability = $requestData['other_disability'] ?? 'Not Specified';
                }

                $templateProcessor->setValue('DISABILITY_TYPE', $disability);
                break;

            case 'GP Indigency':
            case 'Solo Parent':
                $templateProcessor->setValue('PURPOSE', $requestData['purpose'] ?? 'N/A');
                break;
        }

        // --- Signature Injection ---
        $signaturePath = $requestData['signature_path'] ?? null;

        if (($isResidency || $isOathDocument) && $signaturePath) {
            $signatureFullPath = storage_path('app/private/' . $signaturePath);

            if (file_exists($signatureFullPath)) {
                $templateProcessor->setImageValue('USER_SIGNATURE', [
                    'path' => $signatureFullPath,
                    'width' => 100,
                    'height' => 50,
                    'ratio' => true,
                ]);
            } else {
                return back()->with('error', 'Generation failed: Signature file not found on server.');
            }
        }

        // --- Finalize and Download ---
        $documentRequest->update([
            'status' => 'Ready for Pickup',
            'processed_by' => auth()->id(),
        ]);

        $filePrefix = Str::studly($documentTypeOriginalName);
        $lastName = $profile->last_name ?? 'Resident';
        $fileName = "{$filePrefix}Cert_{$lastName}.docx";

        $pathToSave = storage_path("app/public/generated/{$fileName}");

        if (!is_dir(dirname($pathToSave))) {
            mkdir(dirname($pathToSave), 0755, true);
        }

        $templateProcessor->saveAs($pathToSave);

        return response()->download($pathToSave)->deleteFileAfterSend(true);
    }
}
