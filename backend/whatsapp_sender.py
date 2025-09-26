# backend/whatsapp_sender.py (Final Professional Version)
import os
import logging
from twilio.rest import Client
from datetime import datetime

logger = logging.getLogger(__name__)

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")

twilio_client = None
if not all([ACCOUNT_SID, AUTH_TOKEN, TWILIO_NUMBER]):
    logger.error("TWILIO DEBUG: Credentials are NOT fully configured in .env file.")
else:
    logger.info("TWILIO DEBUG: Credentials loaded from .env file.")
    twilio_client = Client(ACCOUNT_SID, AUTH_TOKEN)

def send_absentee_message(parent_phone, student_name, subject, teacher, time_slot):
    """Sends a professional, bilingual WhatsApp message to a parent."""
    if not twilio_client:
        logger.warning("Twilio client not initialized. Cannot send message.")
        return False

    try:
        to_number = f"whatsapp:+{parent_phone.strip()}"
        today_date = datetime.now().strftime('%d/%m/%Y') # Format date as DD/MM/YYYY

        # --- Professional English Message ---
        english_message = (
            f"Dear Parent,\n\n"
            f"This is an automated attendance alert from Sharadchandra Pawar Institute of Technology for your ward, *{student_name}*.\n\n"
            f"Our records indicate they were marked *ABSENT* for the following lecture today ({today_date}):\n"
            f"  - *Subject:* {subject}\n"
            f"  - *Teacher:* {teacher}\n"
            f"  - *Time:* {time_slot}\n\n"
            f"Please contact the college administration for any queries.\n\n"
            f"- Project Netra System"
        )

        # --- Professional Marathi Message ---
        marathi_message = (
            f"आदरणीय पालक,\n\n"
            f"शरदचंद्र पवार इन्स्टिट्यूट ऑफ टेक्नॉलॉजी मधून ही एक स्वयंचलित उपस्थिती सूचना आहे, आपला पाल्य *{student_name}* साठी.\n\n"
            f"आमच्या नोंदीनुसार, तो/ती आज ({today_date}) खालील लेक्चरसाठी *गैरहजर* होता/होती:\n"
            f"  - *विषय:* {subject}\n"
            f"  - *शिक्षक:* {teacher}\n"
            f"  - *वेळ:* {time_slot}\n\n"
            f"कोणत्याही प्रश्नांसाठी कृपया कॉलेज प्रशासनाशी संपर्क साधा.\n\n"
            f"- प्रोजेक्ट नेत्र प्रणाली"
        )

        # Combine messages
        final_message = f"{english_message}\n\n---\n\n{marathi_message}"
        
        message = twilio_client.messages.create(
            from_=TWILIO_NUMBER,
            body=final_message,
            to=to_number
        )
        logger.info(f"TWILIO SUCCESS: Message sent to {to_number}. SID: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"TWILIO FAILED: Failed to send WhatsApp message to {parent_phone}. Reason: {str(e)}")
        return False