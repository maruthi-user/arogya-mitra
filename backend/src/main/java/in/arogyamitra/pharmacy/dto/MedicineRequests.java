package in.arogyamitra.pharmacy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Typed request bodies for /api/medicine-requests. */
public final class MedicineRequests {
    private MedicineRequests() {}

    /** A patient asks a pharmacy for a medicine. The medicine must exist in the reference data. */
    public record CreateMedicineRequest(
            @NotBlank(message = "Choose a pharmacy") @Size(max = 80, message = "Invalid pharmacyId")
                    String pharmacyId,
            @NotBlank(message = "Choose a medicine") @Size(max = 80, message = "Invalid medicineId")
                    String medicineId,
            @Size(max = 500, message = "Message is too long") String message) {}

    /** An admin records progress on a request. */
    public record UpdateMedicineRequestStatus(
            @NotBlank(message = "Invalid status")
                    @Pattern(regexp = "contacted|resolved", message = "Invalid status")
                    String status) {}
}
