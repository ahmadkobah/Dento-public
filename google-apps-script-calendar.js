/**
 * CANINE CLINIC - Google Calendar Booking Script
 * 
 * HOW TO SET UP:
 * 
 * 1. Go to https://script.google.com
 * 2. Create a new project and name it "Clinic Bookings"
 * 3. Delete the default code and paste this entire file
 * 4. Update the CALENDAR_ID below with your Google Calendar ID
 *    (Found in Google Calendar Settings > Calendar ID)
 * 5. Click Deploy > New deployment
 * 6. Select type: Web app
 * 7. Execute as: Me
 * 8. Who has access: Anyone
 * 9. Click Deploy and authorize
 * 10. Copy the Web App URL
 * 11. Paste the URL in BookingCalendar.jsx (GOOGLE_SCRIPT_URL)
 * 
 * OPTIONAL: Use different calendars for each branch/doctor
 * Just update the CALENDARS object below
 */

// Your Google Calendar ID - Replace with your actual calendar ID
// Find it in Google Calendar > Settings > Calendar ID
// For your primary calendar, use your email or 'primary'
const DEFAULT_CALENDAR_ID = 'primary';

// Optional: Different calendars for different branches/doctors
const CALENDARS = {
  'nasr-city': 'primary',  // Replace with Nasr City branch calendar ID
  'shorouk': 'primary',    // Replace with Shorouk branch calendar ID
  // Or use doctor-specific calendars:
  // '1': 'user1@example.com',
  // '2': 'user2@example.com',
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Get the appropriate calendar
    const calendarId = CALENDARS[data.branchId] || CALENDARS[data.doctorId] || DEFAULT_CALENDAR_ID;
    const calendar = CalendarApp.getCalendarById(calendarId);
    
    if (!calendar) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Calendar not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse dates
    const startTime = new Date(data.date);
    const endTime = new Date(data.endDate);
    
    // Create event title and description
    const title = `🦷 ${data.patientName} - ${data.specialty}`;
    const description = `
Patient: ${data.patientName}
Phone: ${data.patientPhone}
Branch: ${data.branch}
Doctor: ${data.doctor}
Specialty: ${data.specialty}
Time: ${data.displayTime}

---
Booked via Canine Clinic Website
    `.trim();
    
    // Create the calendar event
    const event = calendar.createEvent(title, startTime, endTime, {
      description: description,
      location: data.branch
    });
    
    // Optional: Send email notification
    // MailApp.sendEmail({
    //   to: 'clinic@example.com',
    //   subject: `New Appointment: ${data.patientName}`,
    //   body: description
    // });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      eventId: event.getId(),
      message: 'Appointment created successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'Canine Clinic Booking API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Test function - Run this to test calendar access
function testCalendarAccess() {
  const calendar = CalendarApp.getCalendarById(DEFAULT_CALENDAR_ID);
  if (calendar) {
    Logger.log('Calendar found: ' + calendar.getName());
    
    // Create a test event
    const testEvent = calendar.createEvent(
      'Test Booking - Delete Me',
      new Date(),
      new Date(new Date().getTime() + 30 * 60000), // 30 minutes later
      { description: 'This is a test booking from Canine Clinic website' }
    );
    Logger.log('Test event created: ' + testEvent.getId());
  } else {
    Logger.log('Calendar not found!');
  }
}
