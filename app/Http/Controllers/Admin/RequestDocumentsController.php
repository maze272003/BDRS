<?php

namespace App\Http\Controllers\Admin;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Models\DocumentRequest;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use App\Events\DocumentRequestStatusUpdated;
use App\Models\ImmutableDocumentsArchiveHistory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RequestDocumentsController extends Controller
{
  public function index(Request $request): Response
    {
        $filters = $request->only('search', 'status');
        $documentRequests = DocumentRequest::query()
            ->whereNotIn('status', ['Claimed', 'Rejected'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('user.profile', function ($subQuery) use ($search) {
                        $subQuery->where('first_name', 'like', "%{$search}%")
                                 ->orWhere('last_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('documentType', function ($subQuery) use ($search) {
                        $subQuery->where('name', 'like', "%{$search}%");
                    });
                });
            })
            ->when(($filters['status'] ?? 'All') !== 'All', function ($query) use ($filters) {
                $query->where('status', $filters['status']);
            })
            ->with(['user.profile', 'documentType'])
            ->latest()
            ->paginate(10)
            ->withQueryString();
            
        return Inertia::render('Admin/Request', [
            'documentRequests' => $documentRequests,
            'filters' => $filters,
        ]);
    }

    public function setPaymentAmount(Request $request, DocumentRequest $documentRequest): RedirectResponse
    {
        if ($documentRequest->documentType->name !== 'Brgy Business Permit') {
            return back()->with('error', 'This action is not applicable for this document type.');
        }

        $validated = $request->validate([
            'payment_amount' => 'required|numeric|min:0|max:999999.99',
        ]);

        $documentRequest->update([
            'payment_amount' => $validated['payment_amount'],
            'status' => 'Waiting for Payment',
        ]);

        DocumentRequestStatusUpdated::dispatch($documentRequest);

        return back()->with('success', 'Payment amount has been set. The user will be notified.');
    }


     public function showReceipt(DocumentRequest $documentRequest): StreamedResponse
    {
        if (!$documentRequest->payment_receipt_path || !Storage::disk('s3-private')->exists($documentRequest->payment_receipt_path)) {
            abort(404, 'Receipt file not found.');
        }
        return Storage::disk('s3-private')->response($documentRequest->payment_receipt_path);
    }
  public function update(Request $request, DocumentRequest $documentRequest): RedirectResponse
    {
        // --- REFINED VALIDATION ---
        // This is a cleaner way to validate. 'admin_remarks' is now explicitly required ONLY IF the status is 'Rejected'.
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['Processing', 'Ready to Pickup', 'Claimed', 'Rejected'])],
            'admin_remarks' => ['required_if:status,Rejected', 'nullable', 'string', 'max:500'],
        ]);

        $status = $validated['status'];
        // Use array_key_exists to safely get remarks, as it might not be in the validated array if not provided
        $remarks = array_key_exists('admin_remarks', $validated) ? $validated['admin_remarks'] : null;

        // If the status is 'Claimed' or 'Rejected', call our helper method.
        if ($status === 'Claimed' || $status === 'Rejected') {
            // 1. Call the helper to do the database work.
            $this->archiveRequest($documentRequest, $status, $remarks);

            // 2. Return the redirect response from THIS method.
            return back()->with('success', 'Request has been archived successfully.');
        }

        // --- VOUCHER GENERATION LOGIC (unchanged) ---
        if ($status === 'Ready to Pickup' && is_null($documentRequest->claim_voucher_code)) {
            $documentRequest->claim_voucher_code = 'VOUCHER-' . Str::upper(Str::random(8));
        }
        
        // Handle all other status updates (unchanged)
        $documentRequest->status = $status;
        $documentRequest->admin_remarks = $remarks;
        $documentRequest->processed_by = auth()->id();
        $documentRequest->save();
        
        DocumentRequestStatusUpdated::dispatch($documentRequest);
        
        return back()->with('success', 'Request status updated successfully.');
    }
    /**
     * --- MODIFIED ---
     * The logic to claim by voucher now correctly archives the request.
     */
    public function claimByVoucher(Request $request)
    {
        $validated = $request->validate([
            'voucher_code' => 'required|string',
        ]);

        $documentRequest = DocumentRequest::where('claim_voucher_code', $validated['voucher_code'])->first();

        if (!$documentRequest) {
            return back()->withErrors(['voucher_code' => 'Invalid or unknown voucher code.']);
        }

        if ($documentRequest->status !== 'Ready to Pickup') {
            return back()->withErrors(['voucher_code' => 'This document is not ready for pickup or has already been claimed.']);
        }

        // --- REFACTORED LOGIC ---
        // Instead of just updating the status, we now call the reusable archive method.
        $this->archiveRequest($documentRequest, 'Claimed');
        // --- END REFACTORED LOGIC ---

        return redirect()->route('admin.request')->with('success', "Success! Document for {$documentRequest->user->profile->full_name} has been marked as claimed and archived.");
    }

  
    
    /**
     * --- NEW HELPER METHOD ---
     * A private method to handle the archiving of a document request.
     * This can be called from anywhere within this controller.
     */
    /**
     * --- MODIFIED HELPER METHOD ---
     * This method now updates the original request's status AND creates an archive record,
     * but it NO LONGER deletes the original request.
     */
    private function archiveRequest(DocumentRequest $documentRequest, string $status, ?string $remarks = null): void
    {
        // 1. Create the immutable history record
        ImmutableDocumentsArchiveHistory::create([
            'original_request_id' => $documentRequest->id,
            'user_id' => $documentRequest->user_id,
            'document_type_id' => $documentRequest->document_type_id,
            'form_data' => $documentRequest->form_data,
            'status' => $status,
            'admin_remarks' => $remarks,
            'processed_by' => auth()->id(),
            'original_created_at' => $documentRequest->created_at,
            // Copy over payment details if they exist
            'payment_amount' => $documentRequest->payment_amount,
            'payment_receipt_path' => $documentRequest->payment_receipt_path,
            'payment_status' => $documentRequest->payment_status,
            'paid_at' => $documentRequest->paid_at,
        ]);

        // 2. Update the status on the original request instead of deleting it
        $documentRequest->update([
            'status' => $status,
            'admin_remarks' => $remarks,
            'processed_by' => auth()->id(),
        ]);

        // 3. Dispatch event for real-time update
        DocumentRequestStatusUpdated::dispatch($documentRequest);
    }
}
