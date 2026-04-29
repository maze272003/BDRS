<?php

namespace App\Http\Controllers\Resident;

use Inertia\Inertia;
use Illuminate\Support\Str;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use App\Models\DocumentRequest;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Events\DocumentRequestCreated;
use App\Models\ImmutableDocumentsArchiveHistory;

class DocumentRequestController extends Controller
{
    /**
     * Display a listing of the user's active and past document requests.
     */
    public function index(Request $request)
    {
        $userId = Auth::id();

        // Fetch active requests (not yet Claimed or Rejected)
        $activeRequests = DocumentRequest::query()
            ->where('user_id', $userId)
            ->with(['documentType', 'user'])
            ->latest()
            ->paginate(5, ['*'], 'active_page')
            ->withQueryString();

        // Fetch past requests (Claimed or Rejected) from the archive table
        $pastRequests = ImmutableDocumentsArchiveHistory::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['Claimed', 'Rejected'])
            ->with(['documentType', 'processor.profile'])
            ->latest('original_created_at')
            ->paginate(5, ['*'], 'past_page')
            ->withQueryString();

        return Inertia::render('Residents/MyRequests', [
            'activeRequests' => $activeRequests,
            'pastRequests'   => $pastRequests,
        ]);
    }

    /**
     * Show the form to create a new document request.
     */
    public function create(DocumentType $documentType)
    {
        $user = Auth::user();

        if (!$user->is_verified) {
            return redirect()->route('residents.home')
                ->with('error', 'Your account must be verified to request documents. Please wait for an admin to approve your credentials.');
        }

        // Explicit mapping to ensure correct component paths
        $map = [
            'Brgy Business Permit' => 'BrgyBusinessPermit',
            'Job Seeker'           => 'JobSeeker',
            'Barangay Clearance'   => 'BrgyClearance',
            'Certificate of Indigency' => 'GpIndigency',
            'Indigency'            => 'Indigency',
            'Oath of Undertaking'  => 'OathOfUndertaking',
            'Pagpapatunay Eduk'    => 'PagpapatunayEduk',
            'pwd'                  => 'Pwd',
            'Residency'            => 'Residency',
            'Solo Parent'          => 'SoloParent',
            'Akap'                 => 'Akap',
        ];

        $componentName = $map[$documentType->name] ?? Str::studly($documentType->name);
        $viewPath = 'Residents/papers/' . $componentName;

        $userProfile = $user->profile;

        // List of documents that need the full_address and full_name.
        $docsNeedingProfileDetails = [
            'Brgy Business Permit',
            'Barangay Clearance'
        ];
        
        if (in_array($documentType->name, $docsNeedingProfileDetails) && $userProfile) {
            // Append an array of accessors for cleaner code
            $userProfile->append(['full_name', 'full_address']);
        }

        return Inertia::render($viewPath, [
            'documentType' => $documentType,
            'userProfile'  => $userProfile,
        ]);
    }

    /**
     * Store a newly created document request in the database.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user->is_verified) {
            return back()->with('error', 'Your account must be verified to submit a request.');
        }

        // 1. Validate common fields
        $commonValidated = $request->validate([
            'document_type_id' => 'required|exists:document_types,id',
            'signature_data'   => 'nullable|string',
        ]);

        $documentType = DocumentType::find($commonValidated['document_type_id']);
        $formData = [];

        // 2. Handle specific fields based on document type
        switch ($documentType->name) {
            case 'Brgy Business Permit':
                $formData = $request->validate([
                    'business_name'    => 'required|string|max:255',
                    'business_type'    => 'required|string|max:255',
                    'business_address' => 'required|string',
                ]);
                break;

            case 'Job Seeker':
                $formData = $request->validate([
                    'years_qualified' => 'required|numeric|min:1',
                ]);
                break;

            case 'pwd':
                $formData = $request->validate([
                    'disability_type'  => 'required|string|max:255',
                    'other_disability' => 'nullable|string|max:255',
                ]);
                break;

            case 'Certificate of Indigency':
            case 'Solo Parent':
            case 'Barangay Clearance':
                $specificData = $request->validate([
                    'purpose'       => 'required|string|max:255',
                    'other_purpose' => 'nullable|string|max:255',
                ]);
                $formData['purpose'] = $specificData['purpose'] === 'Others'
                    ? ($specificData['other_purpose'] ?? 'Not specified')
                    : $specificData['purpose'];
                break;

            case 'Pagpapatunay Eduk':
                $specificData = $request->validate([
                    'school_name'    => 'required|string|max:255',
                    'school_address' => 'required|string|max:255',
                    'course_program' => 'required|string|max:255',
                    'year_level'     => 'required|string|max:255',
                    'academic_year'  => 'required|string|max:255',
                    'purpose'        => 'required|string|max:255',
                    'other_purpose'  => 'nullable|string|max:255',
                ]);

                $formData['purpose'] = $specificData['purpose'] === 'Others'
                    ? ($specificData['other_purpose'] ?? 'Not specified')
                    : $specificData['purpose'];

                $formData['school_name']    = $specificData['school_name'];
                $formData['school_address'] = $specificData['school_address'];
                $formData['course_program'] = $specificData['course_program'];
                $formData['year_level']     = $specificData['year_level'];
                $formData['academic_year']  = $specificData['academic_year'];
                break;

            case 'Oath of Undertaking':
                $specificData = $request->validate([
                    'purpose'            => 'required|string|max:255',
                    'specific_undertaking'=> 'required|string|max:500',
                    'other_purpose'      => 'nullable|string|max:255',
                ]);

                $formData['purpose'] = $specificData['purpose'] === 'Others'
                    ? ($specificData['other_purpose'] ?? 'Not specified')
                    : $specificData['purpose'];

                $formData['specific_undertaking'] = $specificData['specific_undertaking'];
                break;

            default:
                // fallback for documents with no extra fields
                break;
        }

        // 3. Handle Signature if provided
        if (!empty($commonValidated['signature_data'])) {
            $image = str_replace('data:image/png;base64,', '', $commonValidated['signature_data']);
            $image = str_replace(' ', '+', $image);
            $imageData = base64_decode($image);

            $fileName = 'signature_' . auth()->id() . '_' . uniqid() . '.png';
            $signaturePath = 'private/signatures/' . $fileName;

            Storage::disk('local')->put($signaturePath, $imageData);
            $formData['signature_path'] = $signaturePath;
        }

        // 4. Save document request
        $newRequest = DocumentRequest::create([
            'user_id'          => $user->id,
            'barangay_id'      => $user->barangay_id,
            'document_type_id' => $commonValidated['document_type_id'],
            'status'           => 'Pending',
            'form_data'        => $formData,
        ]);

        // 5. Fire event to notify admins
        DocumentRequestCreated::dispatch($newRequest);

        return redirect()
            ->route('residents.requests.index')
            ->with('success', 'Request for ' . $documentType->name . ' submitted successfully!');
    }

    /**
     * Handle the submission of a payment receipt.
     */
    public function submitPayment(Request $request, DocumentRequest $documentRequest)
    {
        if ($documentRequest->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        if ($documentRequest->status !== 'Waiting for Payment') {
            return back()->with('error', 'This request is not currently awaiting payment.');
        }

        $validated = $request->validate([
            'receipt' => 'required|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        $path = $validated['receipt']->store('receipts', 'local');

        $documentRequest->update([
            'payment_receipt_path' => $path,
            'payment_status'       => 'paid',
            'paid_at'              => now(),
            'status'               => 'Processing',
        ]);

        return redirect()->route('residents.requests.index')
            ->with('success', 'Payment submitted successfully! Your request is now being processed.');
    }
}