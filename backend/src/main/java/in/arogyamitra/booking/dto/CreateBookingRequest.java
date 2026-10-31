package in.arogyamitra.booking.dto;

import java.util.*;

/** Existing JSON field names are retained for frontend and Postman compatibility. */
public record CreateBookingRequest(String pid,String patientId,String date,String time,String name,String village,String reason) {
    public Map<String,Object> toInput(){
        var fields=new LinkedHashMap<String,Object>();
        fields.put("pid",pid);fields.put("patientId",patientId);fields.put("date",date);fields.put("time",time);
        fields.put("name",name);fields.put("village",village);fields.put("reason",reason);return fields;
    }
}
