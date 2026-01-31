import base64
import json
import logging
import os
from datetime import datetime

import requests
from flask import Blueprint, current_app, jsonify, request

from models import Announcement, Parent, ParentNotification, db

api_integrations_bp = Blueprint('api_integrations', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.provider = os.getenv('EMAIL_PROVIDER', 'generic')
        self.api_key = os.getenv('EMAIL_API_KEY', '')
        self.api_url = os.getenv('EMAIL_API_URL', '')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@school.com')
        self.sendgrid_key = os.getenv('SENDGRID_API_KEY', '')
        self.sendgrid_from = os.getenv('SENDGRID_FROM_EMAIL', self.from_email)
        self.fake = os.getenv('EMAIL_FAKE_DELIVERY', '0') == '1'

    def send_email(self, to_email, subject, body, html_body=None):
        try:
            if self.fake:
                logger.info(f"[FAKE EMAIL] to={to_email} subject={subject}")
                return {'success': True, 'message_id': 'fake'}
            if self.provider.lower() == 'sendgrid' and self.sendgrid_key:
                headers = {
                    'Authorization': f'Bearer {self.sendgrid_key}',
                    'Content-Type': 'application/json'
                }
                content = [{'type': 'text/plain', 'value': body}]
                if html_body:
                    content.append({'type': 'text/html', 'value': html_body})
                payload = {
                    'personalizations': [{'to': [{'email': to_email}]}],
                    'from': {'email': self.sendgrid_from},
                    'subject': subject,
                    'content': content
                }
                response = requests.post('https://api.sendgrid.com/v3/mail/send', json=payload, headers=headers)
                if response.status_code in (200, 202):
                    return {'success': True, 'message_id': 'accepted'}
                return {'success': False, 'error': response.text}
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            data = {
                'from': self.from_email,
                'to': to_email,
                'subject': subject,
                'text': body
            }
            if html_body:
                data['html'] = html_body
            if not self.api_url:
                return {'success': False, 'error': 'EMAIL_API_URL not configured'}
            response = requests.post(f'{self.api_url}/send', json=data, headers=headers)
            response.raise_for_status()
            return {'success': True, 'message_id': response.json().get('id')}
        except Exception as e:
            return {'success': False, 'error': str(e)}


class SMSService:
    def __init__(self):
        self.provider = os.getenv('SMS_PROVIDER', 'generic')
        self.api_key = os.getenv('SMS_API_KEY', '')
        self.api_url = os.getenv('SMS_API_URL', '')
        self.sender_id = os.getenv('SMS_SENDER_ID', 'SCHOOL')
        self.twilio_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
        self.twilio_token = os.getenv('TWILIO_AUTH_TOKEN', '')
        self.twilio_from = os.getenv('TWILIO_FROM', '') or os.getenv('TWILIO_PHONE_NUMBER', '')
        self.fake = os.getenv('SMS_FAKE_DELIVERY', '0') == '1'

    def send_sms(self, phone_number, message):
        try:
            if self.fake:
                logger.info(f"[FAKE SMS] to={phone_number} message={message}")
                return {'success': True, 'message_id': 'fake'}
            if self.provider.lower() == 'twilio' and self.twilio_sid and self.twilio_token and self.twilio_from:
                url = f'https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json'
                data = {'From': self.twilio_from, 'To': phone_number, 'Body': message}
                response = requests.post(url, data=data, auth=(self.twilio_sid, self.twilio_token))
                if response.status_code in (200, 201):
                    return {'success': True, 'message_id': response.json().get('sid')}
                return {'success': False, 'error': response.text}
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            data = {
                'to': phone_number,
                'message': message,
                'sender': self.sender_id
            }
            if not self.api_url:
                return {'success': False, 'error': 'SMS_API_URL not configured'}
            response = requests.post(f'{self.api_url}/send', json=data, headers=headers)
            response.raise_for_status()
            return {'success': True, 'message_id': response.json().get('id')}
        except Exception as e:
            return {'success': False, 'error': str(e)}


class PushNotificationService:
    def __init__(self):
        self.provider = os.getenv('PUSH_PROVIDER', 'generic')
        self.api_key = os.getenv('PUSH_API_KEY', '')
        self.api_url = os.getenv('PUSH_API_URL', '')
        self.app_id = os.getenv('PUSH_APP_ID', 'school-app')
        self.fcm_key = os.getenv('FCM_SERVER_KEY', '')

    def send_push_notification(self, user_id, title, message, data=None, device_token=None):
        try:
            if self.provider.lower() == 'firebase' and self.fcm_key and device_token:
                headers = {
                    'Authorization': f'key={self.fcm_key}',
                    'Content-Type': 'application/json'
                }
                payload = {
                    'to': device_token,
                    'notification': {'title': title, 'body': message},
                    'data': data or {}
                }
                response = requests.post('https://fcm.googleapis.com/fcm/send', json=payload, headers=headers)
                if response.status_code == 200:
                    return {'success': True, 'notification_id': 'fcm'}
                return {'success': False, 'error': response.text}
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'app_id': self.app_id,
                'user_id': user_id,
                'title': title,
                'message': message,
                'data': data or {}
            }
            if not self.api_url:
                return {'success': False, 'error': 'PUSH_API_URL not configured'}
            response = requests.post(f'{self.api_url}/push', json=payload, headers=headers)
            response.raise_for_status()
            return {'success': True, 'notification_id': response.json().get('id')}
        except Exception as e:
            return {'success': False, 'error': str(e)}


class PaymentGatewayService:
    """Payment gateway integration"""

    def __init__(self):
        self.api_key = os.getenv('PAYMENT_API_KEY', 'your-payment-api-key')
        self.api_url = os.getenv('PAYMENT_API_URL', 'https://api.paymentgateway.com/v1')
        self.merchant_id = os.getenv('PAYMENT_MERCHANT_ID', 'school-merchant')

    def create_payment_link(self, amount, currency, description, customer_email, metadata=None):
        """Create payment link using external service"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            data = {
                'merchant_id': self.merchant_id,
                'amount': amount,
                'currency': currency,
                'description': description,
                'customer_email': customer_email,
                'metadata': metadata or {},
                'success_url': f"{current_app.config.get('BASE_URL', 'http://localhost:5000')}/payment/success",
                'cancel_url': f"{current_app.config.get('BASE_URL', 'http://localhost:5000')}/payment/cancel"
            }

            response = requests.post(f'{self.api_url}/payment-links', json=data, headers=headers)
            response.raise_for_status()

            result = response.json()
            logger.info(f"Payment link created: {result.get('payment_url')}")
            return {
                'success': True,
                'payment_url': result.get('payment_url'),
                'payment_id': result.get('payment_id')
            }

        except Exception as e:
            logger.error(f"Failed to create payment link: {str(e)}")
            return {'success': False, 'error': str(e)}

    def verify_payment(self, payment_id):
        """Verify payment status"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            response = requests.get(f'{self.api_url}/payments/{payment_id}', headers=headers)
            response.raise_for_status()

            result = response.json()
            return {
                'success': True,
                'status': result.get('status'),
                'amount': result.get('amount'),
                'currency': result.get('currency')
            }

        except Exception as e:
            logger.error(f"Failed to verify payment {payment_id}: {str(e)}")
            return {'success': False, 'error': str(e)}


class FileStorageService:
    """Cloud file storage integration"""

    def __init__(self):
        self.api_key = os.getenv('STORAGE_API_KEY', 'your-storage-api-key')
        self.api_url = os.getenv('STORAGE_API_URL', 'https://api.storageservice.com/v1')
        self.bucket_name = os.getenv('STORAGE_BUCKET', 'school-documents')

    def upload_file(self, file_path, file_name, content_type=None):
        """Upload file to cloud storage"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': content_type or 'application/octet-stream'
            }

            with open(file_path, 'rb') as file:
                files = {'file': (file_name, file, content_type)}
                data = {'bucket': self.bucket_name}

                response = requests.post(f'{self.api_url}/upload', files=files, data=data, headers=headers)
                response.raise_for_status()

            result = response.json()
            logger.info(f"File uploaded successfully: {result.get('file_url')}")
            return {
                'success': True,
                'file_url': result.get('file_url'),
                'file_id': result.get('file_id')
            }

        except Exception as e:
            logger.error(f"Failed to upload file {file_name}: {str(e)}")
            return {'success': False, 'error': str(e)}

    def delete_file(self, file_id):
        """Delete file from cloud storage"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            data = {
                'bucket': self.bucket_name,
                'file_id': file_id
            }

            response = requests.delete(f'{self.api_url}/files/{file_id}', json=data, headers=headers)
            response.raise_for_status()

            logger.info(f"File deleted successfully: {file_id}")
            return {'success': True}

        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {str(e)}")
            return {'success': False, 'error': str(e)}


# Initialize service instances
email_service = EmailService()
sms_service = SMSService()
push_service = PushNotificationService()
payment_service = PaymentGatewayService()
storage_service = FileStorageService()

class AIService:
    def __init__(self):
        self.provider = os.getenv('AI_PROVIDER', 'openai')
        self.openai_key = os.getenv('OPENAI_API_KEY', '')
        self.google_key = os.getenv('GOOGLE_API_KEY', '')
        self.hf_token = os.getenv('HUGGINGFACE_API_TOKEN', '')
        self.openai_chat_model = os.getenv('OPENAI_CHAT_MODEL', 'gpt-4o-mini')
        self.openai_tts_model = os.getenv('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts')
        self.openai_stt_model = os.getenv('OPENAI_STT_MODEL', 'whisper-1')
        self.hf_image_caption_model = os.getenv('HF_IMAGE_CAPTION_MODEL', 'nlpconnect/vit-gpt2-image-captioning')
        self.hf_emotion_model = os.getenv('HF_EMOTION_MODEL', 'trpakov/vit-face-expression')
        self.hf_translation_model = os.getenv('HF_TRANSLATION_MODEL', 'facebook/m2m100_418M')
        self.hf_ocr_model = os.getenv('HF_OCR_MODEL', 'microsoft/trocr-base-printed')
        self.supported_languages_env = os.getenv('SUPPORTED_LANGUAGES', '')

    def transcribe_audio(self, file_path):
        if self.provider.lower() == 'openai' and self.openai_key:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                data = {'model': self.openai_stt_model}
                headers = {'Authorization': f'Bearer {self.openai_key}'}
                r = requests.post('https://api.openai.com/v1/audio/transcriptions', headers=headers, data=data, files=files)
                if r.status_code in (200, 201):
                    return {'success': True, 'text': r.json().get('text')}
                return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def synthesize_speech(self, text, voice='alloy', format_='mp3'):
        if self.provider.lower() == 'openai' and self.openai_key:
            headers = {
                'Authorization': f'Bearer {self.openai_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'model': self.openai_tts_model,
                'input': text,
                'voice': voice,
                'format': format_
            }
            r = requests.post('https://api.openai.com/v1/audio/speech', headers=headers, json=payload)
            if r.status_code in (200, 201):
                audio_b64 = base64.b64encode(r.content).decode('utf-8')
                return {'success': True, 'audio_base64': audio_b64, 'format': format_}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def analyze_image(self, file_path=None, url=None):
        if self.provider.lower() in ('huggingface', 'hf') and self.hf_token:
            headers = {'Authorization': f'Bearer {self.hf_token}'}
            api = f'https://api-inference.huggingface.co/models/{self.hf_image_caption_model}'
            if file_path:
                with open(file_path, 'rb') as f:
                    r = requests.post(api, headers=headers, data=f.read())
            else:
                r = requests.post(api, headers=headers, json={'inputs': url})
            if r.status_code == 200:
                try:
                    out = r.json()
                    if isinstance(out, list) and out and 'generated_text' in out[0]:
                        return {'success': True, 'caption': out[0]['generated_text']}
                    return {'success': True, 'result': out}
                except Exception:
                    return {'success': True, 'raw': r.text}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def recognize_emotion(self, file_path):
        if self.provider.lower() in ('huggingface', 'hf') and self.hf_token:
            headers = {'Authorization': f'Bearer {self.hf_token}'}
            api = f'https://api-inference.huggingface.co/models/{self.hf_emotion_model}'
            with open(file_path, 'rb') as f:
                r = requests.post(api, headers=headers, data=f.read())
            if r.status_code == 200:
                try:
                    out = r.json()
                    return {'success': True, 'result': out}
                except Exception:
                    return {'success': True, 'raw': r.text}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def career_guidance(self, profile_text):
        if self.provider.lower() == 'openai' and self.openai_key:
            headers = {
                'Authorization': f'Bearer {self.openai_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'model': self.openai_chat_model,
                'messages': [
                    {'role': 'system', 'content': 'You are a career counselor for students.'},
                    {'role': 'user', 'content': profile_text}
                ]
            }
            r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
            if r.status_code == 200:
                j = r.json()
                text = j['choices'][0]['message']['content']
                return {'success': True, 'advice': text}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def generate_video_script(self, topic, level='secondary'):
        if self.provider.lower() == 'openai' and self.openai_key:
            headers = {
                'Authorization': f'Bearer {self.openai_key}',
                'Content-Type': 'application/json'
            }
            prompt = f"Create an educational video script on '{topic}' for {level} students. Include sections: intro, learning objectives, segments, activities, and conclusion."
            payload = {
                'model': self.openai_chat_model,
                'messages': [
                    {'role': 'system', 'content': 'You create structured educational video scripts.'},
                    {'role': 'user', 'content': prompt}
                ]
            }
            r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
            if r.status_code == 200:
                j = r.json()
                text = j['choices'][0]['message']['content']
                return {'success': True, 'script': text}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def analytics_longitudinal(self, records):
        if not records:
            return {'success': False, 'error': 'No records'}
        scores = [r.get('score', 0) for r in records]
        avg = sum(scores) / max(len(scores), 1)
        delta = scores[-1] - scores[0] if len(scores) >= 2 else 0
        return {'success': True, 'average': avg, 'delta': delta, 'count': len(scores)}

    def analytics_cohort(self, cohorts):
        if not cohorts:
            return {'success': False, 'error': 'No cohorts'}
        result = []
        for c in cohorts:
            s = c.get('scores', [])
            avg = sum(s) / max(len(s), 1) if s else 0
            result.append({'name': c.get('name', 'unknown'), 'average': avg, 'count': len(s)})
        return {'success': True, 'cohorts': result}

    def analytics_intervention(self, before, after):
        if not before or not after:
            return {'success': False, 'error': 'Missing data'}
        b_avg = sum(before) / len(before)
        a_avg = sum(after) / len(after)
        improvement = a_avg - b_avg
        return {'success': True, 'before_avg': b_avg, 'after_avg': a_avg, 'improvement': improvement}

    def translate_text(self, text, source_lang=None, target_lang='en', dialect=None):
        p = self.provider.lower()
        if p in ('huggingface', 'hf') and self.hf_token:
            headers = {'Authorization': f'Bearer {self.hf_token}', 'Content-Type': 'application/json'}
            api = f'https://api-inference.huggingface.co/models/{self.hf_translation_model}'
            payload = {'inputs': text, 'parameters': {'src_lang': source_lang or 'auto', 'tgt_lang': target_lang}}
            r = requests.post(api, headers=headers, json=payload)
            if r.status_code == 200:
                try:
                    out = r.json()
                    if isinstance(out, list) and out and 'translation_text' in out[0]:
                        t = out[0]['translation_text']
                    else:
                        t = out if isinstance(out, str) else json.dumps(out)
                    if dialect:
                        t = f"{t} ({dialect})"
                    return {'success': True, 'text': t}
                except Exception:
                    return {'success': True, 'text': r.text}
            return {'success': False, 'error': r.text}
        if p == 'openai' and self.openai_key:
            headers = {'Authorization': f'Bearer {self.openai_key}', 'Content-Type': 'application/json'}
            system_msg = f"You are a professional translator. Translate to {target_lang}" + (f" with {dialect} dialect" if dialect else "") + ". Preserve meaning and tone."
            content = f"Source language: {source_lang or 'auto'}\nText:\n{text}"
            payload = {'model': self.openai_chat_model, 'messages': [{'role': 'system', 'content': system_msg}, {'role': 'user', 'content': content}]}
            r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
            if r.status_code == 200:
                j = r.json()
                t = j['choices'][0]['message']['content']
                return {'success': True, 'text': t}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def ocr_image(self, file_path=None, url=None, lang_hint=None):
        p = self.provider.lower()
        if p in ('huggingface', 'hf') and self.hf_token:
            headers = {'Authorization': f'Bearer {self.hf_token}'}
            api = f'https://api-inference.huggingface.co/models/{self.hf_ocr_model}'
            if file_path:
                with open(file_path, 'rb') as f:
                    r = requests.post(api, headers=headers, data=f.read())
            else:
                r = requests.post(api, headers=headers, json={'inputs': url})
            if r.status_code == 200:
                try:
                    out = r.json()
                    if isinstance(out, list) and out and 'generated_text' in out[0]:
                        return {'success': True, 'text': out[0]['generated_text']}
                    return {'success': True, 'result': out}
                except Exception:
                    return {'success': True, 'raw': r.text}
            return {'success': False, 'error': r.text}
        if p == 'openai' and self.openai_key:
            headers = {'Authorization': f'Bearer {self.openai_key}', 'Content-Type': 'application/json'}
            prompt = f"Extract text from image with language hint: {lang_hint or 'auto'}."
            payload = {'model': self.openai_chat_model, 'messages': [{'role': 'system', 'content': 'You perform OCR on images described or linked.'}, {'role': 'user', 'content': prompt + (f' URL: {url}' if url else '')}]}
            r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
            if r.status_code == 200:
                j = r.json()
                t = j['choices'][0]['message']['content']
                return {'success': True, 'text': t}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def language_detect(self, text):
        p = self.provider.lower()
        if p in ('huggingface', 'hf') and self.hf_token:
            headers = {'Authorization': f'Bearer {self.hf_token}', 'Content-Type': 'application/json'}
            api = 'https://api-inference.huggingface.co/models/papluca/xlm-roberta-base-language-detection'
            r = requests.post(api, headers=headers, json={'inputs': text})
            if r.status_code == 200:
                try:
                    out = r.json()
                    label = out[0][0]['label'] if isinstance(out, list) else None
                    return {'success': True, 'language': label, 'raw': out}
                except Exception:
                    return {'success': True, 'raw': r.text}
            return {'success': False, 'error': r.text}
        if p == 'openai' and self.openai_key:
            headers = {'Authorization': f'Bearer {self.openai_key}', 'Content-Type': 'application/json'}
            payload = {'model': self.openai_chat_model, 'messages': [{'role': 'system', 'content': 'Detect language name and ISO code.'}, {'role': 'user', 'content': text}]}
            r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
            if r.status_code == 200:
                j = r.json()
                t = j['choices'][0]['message']['content']
                return {'success': True, 'detected': t}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def cultural_adapt(self, content, target_language, region=None):
        p = self.provider.lower()
        if p == 'openai' and self.openai_key:
            headers = {'Authorization': f'Bearer {self.openai_key}', 'Content-Type': 'application/json'}
            system_msg = 'You adapt content for cultural sensitivity, inclusivity, and accessibility.'
            prompt = f"Adapt the content for {target_language}" + (f" ({region})" if region else "") + " ensuring cultural relevance, respectful tone, and WCAG-friendly text."
            payload = {'model': self.openai_chat_model, 'messages': [{'role': 'system', 'content': system_msg}, {'role': 'user', 'content': prompt + "\n\n" + content}]}
            r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
            if r.status_code == 200:
                j = r.json()
                t = j['choices'][0]['message']['content']
                return {'success': True, 'content': t}
            return {'success': False, 'error': r.text}
        return {'success': False, 'error': 'Provider not configured'}

    def supported_languages(self):
        if self.supported_languages_env:
            items = [x.strip() for x in self.supported_languages_env.split(',') if x.strip()]
            return items
        default = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'pa', 'ur', 'kn', 'ml', 'or', 'as', 'sd', 'ne', 'si', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'tr', 'vi', 'th', 'id', 'fa', 'he', 'pl', 'nl', 'sv', 'no', 'da', 'fi', 'ro', 'cs', 'uk']
        return default

ai_service = AIService()

@api_integrations_bp.route('/email/send', methods=['POST'])
def send_email():
    """Send email via external service"""
    data = request.get_json()

    if not data or not all(k in data for k in ['to', 'subject', 'body']):
        return jsonify({'error': 'Missing required fields: to, subject, body'}), 400

    result = email_service.send_email(
        data['to'],
        data['subject'],
        data['body'],
        data.get('html_body')
    )

    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500

@api_integrations_bp.route('/ai/translate', methods=['POST'])
def ai_translate():
    data = request.get_json()
    if not data or 'text' not in data or 'target_lang' not in data:
        return jsonify({'error': 'Missing text/target_lang'}), 400
    result = ai_service.translate_text(data['text'], data.get('source_lang'), data['target_lang'], data.get('dialect'))
    status = 200 if result.get('success') else 500
    return jsonify(result), status

@api_integrations_bp.route('/ai/ocr', methods=['POST'])
def ai_ocr():
    lang_hint = request.form.get('lang') or (request.get_json() or {}).get('lang')
    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        temp_path = f"/tmp/{file.filename}"
        file.save(temp_path)
        try:
            result = ai_service.ocr_image(file_path=temp_path, lang_hint=lang_hint)
            os.remove(temp_path)
            status = 200 if result.get('success') else 500
            return jsonify(result), status
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({'error': str(e)}), 500
    url = (request.get_json() or {}).get('url')
    if url:
        result = ai_service.ocr_image(url=url, lang_hint=lang_hint)
        status = 200 if result.get('success') else 500
        return jsonify(result), status
    return jsonify({'error': 'Provide file or url'}), 400

@api_integrations_bp.route('/ai/language/detect', methods=['POST'])
def ai_language_detect():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'Missing text'}), 400
    result = ai_service.language_detect(data['text'])
    status = 200 if result.get('success') else 500
    return jsonify(result), status

@api_integrations_bp.route('/ai/cultural/adapt', methods=['POST'])
def ai_cultural_adapt():
    data = request.get_json()
    if not data or 'content' not in data or 'target_language' not in data:
        return jsonify({'error': 'Missing content/target_language'}), 400
    result = ai_service.cultural_adapt(data['content'], data['target_language'], data.get('region'))
    status = 200 if result.get('success') else 500
    return jsonify(result), status

@api_integrations_bp.route('/i18n/languages', methods=['GET'])
def i18n_languages():
    langs = ai_service.supported_languages()
    return jsonify({'languages': langs}), 200

@api_integrations_bp.route('/i18n/languages/add', methods=['POST'])
def i18n_languages_add():
    data = request.get_json()
    if not data or 'languages' not in data:
        return jsonify({'error': 'Missing languages'}), 400
    existing = set(ai_service.supported_languages())
    new_items = {x.strip() for x in data['languages'] if isinstance(x, str) and x.strip()}
    combined = sorted(existing.union(new_items))
    return jsonify({'languages': combined}), 200

@api_integrations_bp.route('/ai/voice/transcribe', methods=['POST'])
def ai_transcribe():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    temp_path = f"/tmp/{file.filename}"
    file.save(temp_path)
    try:
        result = ai_service.transcribe_audio(temp_path)
        os.remove(temp_path)
        status = 200 if result.get('success') else 500
        return jsonify(result), status
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': str(e)}), 500

@api_integrations_bp.route('/ai/voice/synthesize', methods=['POST'])
def ai_synthesize():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'Missing text'}), 400
    result = ai_service.synthesize_speech(data['text'], data.get('voice', 'alloy'), data.get('format', 'mp3'))
    status = 200 if result.get('success') else 500
    return jsonify(result), status

@api_integrations_bp.route('/ai/image/analyze', methods=['POST'])
def ai_image_analyze():
    url = request.form.get('url') or (request.get_json() or {}).get('url')
    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        temp_path = f"/tmp/{file.filename}"
        file.save(temp_path)
        try:
            result = ai_service.analyze_image(file_path=temp_path)
            os.remove(temp_path)
            status = 200 if result.get('success') else 500
            return jsonify(result), status
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({'error': str(e)}), 500
    elif url:
        result = ai_service.analyze_image(url=url)
        status = 200 if result.get('success') else 500
        return jsonify(result), status
    return jsonify({'error': 'Provide file or url'}), 400

@api_integrations_bp.route('/ai/emotion/recognize', methods=['POST'])
def ai_emotion_recognize():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    temp_path = f"/tmp/{file.filename}"
    file.save(temp_path)
    try:
        result = ai_service.recognize_emotion(temp_path)
        os.remove(temp_path)
        status = 200 if result.get('success') else 500
        return jsonify(result), status
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': str(e)}), 500

@api_integrations_bp.route('/ai/career/advice', methods=['POST'])
def ai_career_advice():
    data = request.get_json()
    if not data or 'profile' not in data:
        return jsonify({'error': 'Missing profile'}), 400
    result = ai_service.career_guidance(data['profile'])
    status = 200 if result.get('success') else 500
    return jsonify(result), status

@api_integrations_bp.route('/ai/video/generate', methods=['POST'])
def ai_video_generate():
    data = request.get_json()
    if not data or 'topic' not in data:
        return jsonify({'error': 'Missing topic'}), 400
    result = ai_service.generate_video_script(data['topic'], data.get('level', 'secondary'))
    status = 200 if result.get('success') else 500
    return jsonify(result), status

@api_integrations_bp.route('/ai/analytics/longitudinal', methods=['POST'])
def ai_analytics_longitudinal():
    data = request.get_json()
    records = data.get('records') if data else None
    result = ai_service.analytics_longitudinal(records or [])
    status = 200 if result.get('success') else 400
    return jsonify(result), status

@api_integrations_bp.route('/ai/analytics/cohort', methods=['POST'])
def ai_analytics_cohort():
    data = request.get_json()
    cohorts = data.get('cohorts') if data else None
    result = ai_service.analytics_cohort(cohorts or [])
    status = 200 if result.get('success') else 400
    return jsonify(result), status

@api_integrations_bp.route('/ai/analytics/intervention', methods=['POST'])
def ai_analytics_intervention():
    data = request.get_json()
    if not data or 'before' not in data or 'after' not in data:
        return jsonify({'error': 'Missing before/after'}), 400
    result = ai_service.analytics_intervention(data['before'], data['after'])
    status = 200 if result.get('success') else 400
    return jsonify(result), status


@api_integrations_bp.route('/sms/send', methods=['POST'])
def send_sms():
    """Send SMS via external service"""
    data = request.get_json()

    if not data or not all(k in data for k in ['phone', 'message']):
        return jsonify({'error': 'Missing required fields: phone, message'}), 400

    result = sms_service.send_sms(data['phone'], data['message'])

    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500


@api_integrations_bp.route('/push/send', methods=['POST'])
def send_push_notification():
    """Send push notification via external service"""
    data = request.get_json()

    if not data or not all(k in data for k in ['user_id', 'title', 'message']):
        return jsonify({'error': 'Missing required fields: user_id, title, message'}), 400

    result = push_service.send_push_notification(
        data['user_id'],
        data['title'],
        data['message'],
        data.get('data')
    )

    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500


@api_integrations_bp.route('/payment/create-link', methods=['POST'])
def create_payment_link():
    """Create payment link via external service"""
    data = request.get_json()

    required_fields = ['amount', 'currency', 'description', 'customer_email']
    if not data or not all(k in data for k in required_fields):
        return jsonify({'error': f'Missing required fields: {", ".join(required_fields)}'}), 400

    result = payment_service.create_payment_link(
        data['amount'],
        data['currency'],
        data['description'],
        data['customer_email'],
        data.get('metadata')
    )

    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500


@api_integrations_bp.route('/payment/verify/<payment_id>', methods=['GET'])
def verify_payment(payment_id):
    """Verify payment status via external service"""
    result = payment_service.verify_payment(payment_id)

    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500


@api_integrations_bp.route('/storage/upload', methods=['POST'])
def upload_file():
    """Upload file to cloud storage"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Save file temporarily
    temp_path = f"/tmp/{file.filename}"
    file.save(temp_path)

    try:
        result = storage_service.upload_file(
            temp_path,
            file.filename,
            file.content_type
        )

        # Clean up temp file
        os.remove(temp_path)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': str(e)}), 500


@api_integrations_bp.route('/notifications/send-bulk', methods=['POST'])
def send_bulk_notifications():
    """Send notifications to multiple parents via multiple channels"""
    data = request.get_json()

    if not data or not all(k in data for k in ['parent_ids', 'title', 'message']):
        return jsonify({'error': 'Missing required fields: parent_ids, title, message'}), 400

    parent_ids = data['parent_ids']
    title = data['title']
    message = data['message']
    channels = data.get('channels', ['database'])  # database, email, sms, push

    results = {
        'database': {'success': 0, 'failed': 0},
        'email': {'success': 0, 'failed': 0},
        'sms': {'success': 0, 'failed': 0},
        'push': {'success': 0, 'failed': 0}
    }

    for parent_id in parent_ids:
        parent = Parent.query.get(parent_id)
        if not parent:
            continue

        # Create database notification
        if 'database' in channels:
            try:
                notification = ParentNotification(
                    parent_id=parent_id,
                    title=title,
                    message=message,
                    notification_type=data.get('type', 'general'),
                    priority=data.get('priority', 'normal')
                )
                db.session.add(notification)
                results['database']['success'] += 1
            except Exception as e:
                logger.error(f"Failed to create database notification for parent {parent_id}: {str(e)}")
                results['database']['failed'] += 1

        # Send email
        if 'email' in channels and parent.email and parent.can_receive_notifications:
            result = email_service.send_email(
                parent.email,
                title,
                message,
                data.get('html_message')
            )
            if result['success']:
                results['email']['success'] += 1
            else:
                results['email']['failed'] += 1

        # Send SMS
        if 'sms' in channels and parent.phone and data.get('send_sms', False):
            result = sms_service.send_sms(parent.phone, message)
            if result['success']:
                results['sms']['success'] += 1
            else:
                results['sms']['failed'] += 1

        # Send push notification
        if 'push' in channels and hasattr(parent, 'user') and parent.user:
            result = push_service.send_push_notification(
                parent.user.id,
                title,
                message,
                {'type': 'notification', 'parent_id': parent_id}
            )
            if result['success']:
                results['push']['success'] += 1
            else:
                results['push']['failed'] += 1

    db.session.commit()

    return jsonify({
        'success': True,
        'results': results,
        'total_processed': len(parent_ids)
    }), 200


@api_integrations_bp.route('/announcements/broadcast', methods=['POST'])
def broadcast_announcement():
    """Broadcast announcement to parents via multiple channels"""
    data = request.get_json()

    if not data or not all(k in data for k in ['title', 'content']):
        return jsonify({'error': 'Missing required fields: title, content'}), 400

    # Create announcement
    announcement = Announcement(
        title=data['title'],
        content=data['content'],
        announcement_type=data.get('type', 'general'),
        priority=data.get('priority', 'normal'),
        target_audience=data.get('target_audience', 'all'),
        target_class_id=data.get('target_class_id'),
        is_published=True,
        published_at=datetime.utcnow(),
        created_by=request.current_user.id if hasattr(request, 'current_user') else 1
    )

    db.session.add(announcement)
    db.session.flush()  # Get announcement ID

    # Get target parents
    query = Parent.query
    if announcement.target_class_id:
        # Only parents of students in the target class
        from models import Student
        student_ids = [s.id for s in Student.query.filter_by(class_id=announcement.target_class_id).all()]
        query = query.filter(Parent.student_id.in_(student_ids))

    parents = query.all()

    channels = data.get('channels', ['database'])
    results = {
        'database': {'success': 0, 'failed': 0},
        'email': {'success': 0, 'failed': 0},
        'sms': {'success': 0, 'failed': 0},
        'push': {'success': 0, 'failed': 0}
    }

    for parent in parents:
        # Create announcement read record
        if 'database' in channels:
            try:
                read_record = AnnouncementRead(
                    announcement_id=announcement.id,
                    parent_id=parent.id
                )
                db.session.add(read_record)
                results['database']['success'] += 1
            except Exception as e:
                logger.error(f"Failed to create announcement read record for parent {parent.id}: {str(e)}")
                results['database']['failed'] += 1

        # Send email
        if 'email' in channels and parent.email and parent.can_receive_notifications:
            result = email_service.send_email(
                parent.email,
                f"School Announcement: {announcement.title}",
                announcement.content
            )
            if result['success']:
                results['email']['success'] += 1
            else:
                results['email']['failed'] += 1

        # Send SMS
        if 'sms' in channels and parent.phone and data.get('send_sms', False):
            result = sms_service.send_sms(
                parent.phone,
                f"School Announcement: {announcement.title[:50]}..."
            )
            if result['success']:
                results['sms']['success'] += 1
            else:
                results['sms']['failed'] += 1

        # Send push notification
        if 'push' in channels and hasattr(parent, 'user') and parent.user:
            result = push_service.send_push_notification(
                parent.user.id,
                f"School Announcement: {announcement.title}",
                announcement.content[:100] + "..." if len(announcement.content) > 100 else announcement.content,
                {'type': 'announcement', 'announcement_id': announcement.id}
            )
            if result['success']:
                results['push']['success'] += 1
            else:
                results['push']['failed'] += 1

    db.session.commit()

    return jsonify({
        'success': True,
        'announcement_id': announcement.id,
        'results': results,
        'total_parents': len(parents)
    }), 200


@api_integrations_bp.route('/health-check', methods=['GET'])
def health_check():
    """Check status of all external API integrations"""
    services = {
        'email': check_service_status(email_service, 'email'),
        'sms': check_service_status(sms_service, 'sms'),
        'push': check_service_status(push_service, 'push'),
        'payment': check_service_status(payment_service, 'payment'),
        'storage': check_service_status(storage_service, 'storage')
    }

    all_healthy = all(service['status'] == 'healthy' for service in services.values())

    return jsonify({
        'overall_status': 'healthy' if all_healthy else 'degraded',
        'services': services,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if all_healthy else 503


def check_service_status(service, service_name):
    """Check if a service is responding"""
    try:
        # This is a basic check - in production, you'd make actual API calls
        if hasattr(service, 'api_url') and service.api_url:
            # Make a simple HEAD request to check connectivity
            response = requests.head(service.api_url, timeout=5)
            return {
                'status': 'healthy' if response.status_code < 500 else 'degraded',
                'response_time': response.elapsed.total_seconds(),
                'last_checked': datetime.utcnow().isoformat()
            }
        else:
            return {
                'status': 'not_configured',
                'message': f'{service_name} service not properly configured',
                'last_checked': datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_checked': datetime.utcnow().isoformat()
        }
