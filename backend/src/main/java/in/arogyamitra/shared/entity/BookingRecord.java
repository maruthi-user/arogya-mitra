package in.arogyamitra.shared.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "bookings")
public class BookingRecord {
    @Id
    @Column(length = 80)
    public String id;

    @Column(name = "pid", nullable = false, length = 80)
    public String providerId;

    @Column(name = "patient_id", length = 80)
    public String patientId;

    @Column(name = "booking_date", nullable = false, length = 10)
    public String date;

    @Column(name = "booking_time", nullable = false, length = 5)
    public String time;

    @Column(nullable = false, length = 20)
    public String status;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String document;

    @Column(name = "expires_at", nullable = false)
    public long expiresAt;

    public BookingRecord() {}
}
