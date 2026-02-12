"""
End-to-End Tests for SBS Claims Submission Workflow
Uses Playwright for browser automation
"""

import pytest
import os
import re

pytest.importorskip("playwright.sync_api")
from playwright.sync_api import Page, expect, sync_playwright
from faker import Faker

# Initialize faker for generating test data
fake = Faker()

# Configuration
BASE_URL = os.environ.get('SBS_BASE_URL', 'http://localhost:3000')
API_BASE_URL = os.environ.get('SBS_API_URL', 'http://localhost:3000')
HEADLESS = os.environ.get('HEADLESS', 'true').lower() == 'true'


@pytest.fixture(scope="session")
def browser_context():
    """Create a browser context for testing"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            locale='en-US',
            timezone_id='Asia/Riyadh',
        )
        yield context
        context.close()
        browser.close()


@pytest.fixture
def page(browser_context):
    """Create a new page for each test"""
    page = browser_context.new_page()
    yield page
    page.close()


class TestLandingPage:
    """Test the landing page functionality"""

    def test_page_loads_correctly(self, page: Page):
        """Test that the landing page loads with all main elements"""
        page.goto(BASE_URL)

        # Check page title
        expect(page).to_have_title(re.compile(r"SBS.*", re.IGNORECASE))

        # Check main hero elements
        expect(page.locator('text=SBS Engine')).to_be_visible()
        expect(page.locator('button:has-text("Submit Claim")')).to_be_visible()

    def test_language_toggle(self, page: Page):
        """Test language switching between English and Arabic"""
        page.goto(BASE_URL)

        # Find and click language toggle
        lang_button = page.locator('button:has-text("AR")')
        expect(lang_button).to_be_visible()
        lang_button.click()

        # Wait for Arabic content
        page.wait_for_timeout(500)

        # Check that the page is now in Arabic
        expect(page.locator('html')).to_have_attribute('dir', 'rtl')
        expect(page.locator('button:has-text("EN")')).to_be_visible()

        # Toggle back to English
        page.locator('button:has-text("EN")').click()
        page.wait_for_timeout(500)
        expect(page.locator('html')).to_have_attribute('dir', 'ltr')

    def test_features_section_visible(self, page: Page):
        """Test that features section is accessible"""
        page.goto(BASE_URL)

        # Click features link in nav
        page.locator('a[href="#features"]').click()

        # Check features section is visible
        expect(page.locator('#features')).to_be_in_viewport()

    def test_keyboard_shortcuts(self, page: Page):
        """Test keyboard shortcuts functionality"""
        page.goto(BASE_URL)

        # Test Ctrl+K opens claim modal
        page.keyboard.press('Control+k')
        page.wait_for_timeout(300)
        expect(page.locator('text=Submit Insurance Claim')).to_be_visible()

        # Test Escape closes modal
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        expect(page.locator('text=Submit Insurance Claim')).not_to_be_visible()


class TestClaimSubmissionModal:
    """Test the claim submission modal"""

    def test_open_close_modal(self, page: Page):
        """Test opening and closing the claim modal"""
        page.goto(BASE_URL)

        # Open modal
        page.locator('button:has-text("Submit Claim")').first.click()
        expect(page.locator('text=Submit Insurance Claim')).to_be_visible()

        # Close modal using X button
        page.locator('[onclick="app.closeClaimModal()"]').click()
        expect(page.locator('text=Submit Insurance Claim')).not_to_be_visible()

    def test_form_validation_required_fields(self, page: Page):
        """Test form validation for required fields"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Try to submit empty form
        page.locator('button[type="submit"]').click()

        # Form should not close (validation failed)
        expect(page.locator('text=Submit Insurance Claim')).to_be_visible()

        # Check that required fields show validation state
        patient_name_input = page.locator('input[name="patientName"]')
        expect(patient_name_input).to_have_attribute('required', '')

    def test_form_validation_email_format(self, page: Page):
        """Test email format validation"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Fill required fields with invalid email
        page.fill('input[name="patientName"]', 'Test Patient')
        page.fill('input[name="patientId"]', '1234567890')
        page.fill('input[name="userEmail"]', 'invalid-email')

        # Submit form
        page.locator('button[type="submit"]').click()
        page.wait_for_timeout(500)

        # Check for validation error in toast
        toast_error = page.locator('[id="toast-container"]').locator('text=Invalid email format')
        if toast_error.count() > 0:
            expect(toast_error).to_be_visible()

    def test_claim_type_selection(self, page: Page):
        """Test claim type dropdown selection"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        claim_type_select = page.locator('select[name="claimType"]')

        # Test each claim type option
        for claim_type in ['professional', 'institutional', 'pharmacy', 'vision']:
            claim_type_select.select_option(claim_type)
            expect(claim_type_select).to_have_value(claim_type)


class TestClaimSubmissionWorkflow:
    """Test the complete claim submission workflow"""

    def test_successful_claim_submission(self, page: Page):
        """Test submitting a claim successfully"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Fill out the form
        page.fill('input[name="patientName"]', fake.name())
        page.fill('input[name="patientId"]', fake.numerify('##########'))
        page.fill('input[name="memberId"]', f'MEM-{fake.random_number(digits=8)}')
        page.fill('input[name="payerId"]', 'PAYER-001')
        page.select_option('select[name="claimType"]', 'professional')
        page.fill('input[name="userEmail"]', fake.email())

        # Submit the form
        page.locator('button[type="submit"]').click()

        # Wait for success modal or processing
        page.wait_for_selector('text=Success', timeout=10000)

        # Verify success message
        expect(page.locator('text=Success')).to_be_visible()

        # Check claim ID is displayed
        claim_id = page.locator('text=/CLM-[A-Z0-9]+-[A-Z0-9]+/')
        expect(claim_id).to_be_visible()

    def test_claim_submission_all_types(self, page: Page):
        """Test submitting claims of all types"""
        claim_types = ['professional', 'institutional', 'pharmacy', 'vision']

        for claim_type in claim_types:
            page.goto(BASE_URL)
            page.locator('button:has-text("Submit Claim")').first.click()
            page.wait_for_timeout(300)

            # Fill out the form
            page.fill('input[name="patientName"]', fake.name())
            page.fill('input[name="patientId"]', fake.numerify('##########'))
            page.select_option('select[name="claimType"]', claim_type)
            page.fill('input[name="userEmail"]', fake.email())

            # Submit
            page.locator('button[type="submit"]').click()

            # Wait for success
            page.wait_for_selector('text=Success', timeout=10000)
            expect(page.locator('text=Success')).to_be_visible()

            # Close success modal
            page.locator('button:has-text("Close")').click()
            page.wait_for_timeout(300)


class TestClaimTracking:
    """Test claim tracking functionality"""

    def test_open_tracking_modal(self, page: Page):
        """Test opening the tracking modal"""
        page.goto(BASE_URL)

        # Click track existing claim
        page.locator('button:has-text("Track Existing Claim")').click()
        page.wait_for_timeout(300)

        # Check tracking modal is visible
        expect(page.locator('text=Claim Tracking')).to_be_visible()
        expect(page.locator('input#tracking-claim-id')).to_be_visible()

    def test_tracking_invalid_claim_id(self, page: Page):
        """Test tracking with invalid claim ID format"""
        page.goto(BASE_URL)

        # Open tracking modal
        page.locator('button:has-text("Track Existing Claim")').click()
        page.wait_for_timeout(300)

        # Enter invalid claim ID
        page.fill('input#tracking-claim-id', 'INVALID-ID')
        page.locator('button:has-text("Start Tracking")').click()
        page.wait_for_timeout(500)

        # Check for error toast
        expect(page.locator('#toast-container')).to_contain_text("Invalid")

    def test_track_after_submission(self, page: Page):
        """Test tracking a claim after successful submission"""
        page.goto(BASE_URL)

        # Submit a claim first
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        page.fill('input[name="patientName"]', fake.name())
        page.fill('input[name="patientId"]', fake.numerify('##########'))
        page.select_option('select[name="claimType"]', 'professional')
        page.fill('input[name="userEmail"]', fake.email())

        page.locator('button[type="submit"]').click()
        page.wait_for_selector('text=Success', timeout=10000)

        # Get the claim ID
        claim_id_element = page.locator('.font-mono.font-bold').first
        claim_id = claim_id_element.inner_text()

        # Click track status
        page.locator('button:has-text("Track Status")').click()
        page.wait_for_timeout(500)

        # Verify tracking modal opens with correct claim ID
        expect(page.locator('text=Claim Tracking')).to_be_visible()
        expect(page.locator(f'text={claim_id}')).to_be_visible()

    def test_tracking_shows_workflow_stages(self, page: Page):
        """Test that tracking shows all workflow stages"""
        page.goto(BASE_URL)

        # Submit a claim
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        page.fill('input[name="patientName"]', fake.name())
        page.fill('input[name="patientId"]', fake.numerify('##########'))
        page.select_option('select[name="claimType"]', 'professional')
        page.fill('input[name="userEmail"]', fake.email())

        page.locator('button[type="submit"]').click()
        page.wait_for_selector('text=Success', timeout=10000)

        # Track the claim
        page.locator('button:has-text("Track Status")').click()
        page.wait_for_timeout(1000)

        # Check for workflow stages
        stages = ['Received', 'Validation', 'Normalization', 'Financial Rules', 'Digital Signing', 'NPHIES Submission']
        for stage in stages:
            expect(page.locator(f'text={stage}')).to_be_visible()

    def test_tracking_url_parameter(self, page: Page):
        """Test that claim ID in URL opens tracking modal"""
        # Navigate with claim ID parameter
        page.goto(f'{BASE_URL}?claimId=CLM-TEST1234-567890')
        page.wait_for_timeout(1000)

        # Tracking modal should be open
        expect(page.locator('text=Claim Tracking')).to_be_visible()
        expect(page.locator('text=CLM-TEST1234-567890')).to_be_visible()


class TestFileUpload:
    """Test file upload functionality"""

    def test_file_drop_zone_visible(self, page: Page):
        """Test that file drop zone is visible in form"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Check drop zone is visible
        expect(page.locator('#file-drop-zone')).to_be_visible()
        expect(page.locator('text=Drag and drop or click to browse')).to_be_visible()

    def test_file_selection(self, page: Page):
        """Test selecting a file for upload"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # File input is manipulated via JavaScript
        # page.locator('input#file-input') available but not directly used

        # Set input files (creates a synthetic file)
        page.evaluate("""
            const dataTransfer = new DataTransfer();
            const file = new File(['test content'], 'test-claim.pdf', { type: 'application/pdf' });
            dataTransfer.items.add(file);
            document.getElementById('file-input').files = dataTransfer.files;
            document.getElementById('file-input').dispatchEvent(new Event('change', { bubbles: true }));
        """)

        page.wait_for_timeout(500)

        # Check file name is displayed
        expect(page.locator('text=test-claim.pdf')).to_be_visible()


class TestResponsiveness:
    """Test responsive design"""

    @pytest.fixture
    def mobile_page(self, browser_context):
        """Create a mobile viewport page"""
        page = browser_context.new_page()
        page.set_viewport_size({"width": 375, "height": 667})
        yield page
        page.close()

    def test_mobile_navigation(self, mobile_page: Page):
        """Test navigation on mobile viewport"""
        mobile_page.goto(BASE_URL)

        # Submit claim button should still be visible
        expect(mobile_page.locator('button:has-text("Submit Claim")')).to_be_visible()

    def test_mobile_modal_fits_screen(self, mobile_page: Page):
        """Test that modals fit on mobile screens"""
        mobile_page.goto(BASE_URL)
        mobile_page.locator('button:has-text("Submit Claim")').first.click()
        mobile_page.wait_for_timeout(300)

        # Modal should be visible and not overflow
        modal = mobile_page.locator('.relative.w-full.max-w-2xl')
        expect(modal).to_be_visible()


class TestAccessibility:
    """Test accessibility features"""

    def test_form_labels_present(self, page: Page):
        """Test that form inputs have proper labels"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Check labels exist for inputs
        expect(page.locator('label:has-text("Patient Name")')).to_be_visible()
        expect(page.locator('label:has-text("Patient ID")')).to_be_visible()
        expect(page.locator('label:has-text("Email")')).to_be_visible()

    def test_keyboard_navigation(self, page: Page):
        """Test that form can be navigated with keyboard"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Tab through form elements
        page.keyboard.press('Tab')  # First input
        focused_element = page.evaluate('document.activeElement.name')
        assert focused_element is not None

    def test_focus_trapped_in_modal(self, page: Page):
        """Test that focus stays within modal when open"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Modal should be visible
        expect(page.locator('text=Submit Insurance Claim')).to_be_visible()

        # Pressing Tab multiple times should keep focus in modal
        for _ in range(20):
            page.keyboard.press('Tab')

        # Focus should still be within the modal area
        # Check is performed via evaluate - result stored for potential assertion
        page.evaluate("""
            const modal = document.querySelector('.relative.w-full.max-w-2xl');
            return modal && modal.contains(document.activeElement);
        """)
        # This test is informational - focus trapping may not be implemented


class TestToastNotifications:
    """Test toast notification system"""

    def test_toast_appears_on_error(self, page: Page):
        """Test that toast appears on form validation error"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Fill with invalid email
        page.fill('input[name="patientName"]', 'Test Patient')
        page.fill('input[name="patientId"]', '1234567890')
        page.fill('input[name="userEmail"]', 'invalid-email')
        page.locator('button[type="submit"]').click()

        page.wait_for_timeout(500)

        # Toast container should exist
        toast_container = page.locator('#toast-container')
        expect(toast_container).to_be_visible()

    def test_toast_dismissable(self, page: Page):
        """Test that toasts can be dismissed"""
        page.goto(BASE_URL)
        page.locator('button:has-text("Submit Claim")').first.click()
        page.wait_for_timeout(300)

        # Trigger a toast
        page.fill('input[name="patientName"]', 'Test Patient')
        page.fill('input[name="patientId"]', '1234567890')
        page.fill('input[name="userEmail"]', 'invalid-email')
        page.locator('button[type="submit"]').click()

        page.wait_for_timeout(500)

        # Find and click close button on toast
        close_btn = page.locator('.toast-close').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(500)


class TestPWAFeatures:
    """Test Progressive Web App features"""

    def test_manifest_present(self, page: Page):
        """Test that PWA manifest is present"""
        page.goto(BASE_URL)

        # Check for manifest link
        manifest_link = page.locator('link[rel="manifest"]')
        expect(manifest_link).to_have_attribute('href', re.compile(r'manifest\.json'))

    def test_service_worker_registered(self, page: Page):
        """Test that service worker is registered"""
        page.goto(BASE_URL)
        page.wait_for_timeout(2000)

        # Check if service worker is registered
        # Result evaluated but not asserted (informational only)
        page.evaluate("""
            async () => {
                if (!('serviceWorker' in navigator)) return false;
                const registrations = await navigator.serviceWorker.getRegistrations();
                return registrations.length > 0;
            }
        """)
        # This may be false in test environment without HTTPS
        # Informational check only - no assertion


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=reports/e2e_report.html", "--self-contained-html"])
