/**
 * Enhanced Claim Submission Form
 * Advanced claim form with service details, diagnosis codes, and real-time validation
 */

class EnhancedClaimForm {
  constructor() {
    this.services = [];
    this.serviceCounter = 0;
    this.simulationMode = false;
    this.availableServices = [];
    this.diagnosisCodes = [];
    this.validationErrors = {};
  }

  async init() {
    await this.loadServiceCatalog();
    await this.loadDiagnosisCodes();
    this.render();
    this.attachEventListeners();
  }

  async loadServiceCatalog() {
    try {
      const apiBaseUrl = window.SBS_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/simulation/service-catalog`);
      const data = await response.json();
      if (data.success) {
        this.availableServices = data.catalog;
      }
    } catch (error) {
      console.error('Failed to load service catalog:', error);
      this.availableServices = {};
    }
  }

  async loadDiagnosisCodes() {
    // Common diagnosis codes
    this.diagnosisCodes = [
      { code: "J06.9", display: "Acute upper respiratory infection, unspecified" },
      { code: "K35.80", display: "Acute appendicitis, unspecified" },
      { code: "E11.9", display: "Type 2 diabetes mellitus without complications" },
      { code: "I10", display: "Essential (primary) hypertension" },
      { code: "H52.1", display: "Myopia" },
      { code: "M54.5", display: "Low back pain" },
      { code: "J45.9", display: "Asthma, unspecified" },
      { code: "K21.9", display: "Gastro-esophageal reflux disease" },
      { code: "F41.9", display: "Anxiety disorder, unspecified" },
      { code: "E78.5", display: "Hyperlipidemia, unspecified" }
    ];
  }

  addService() {
    const serviceId = ++this.serviceCounter;
    this.services.push({
      id: serviceId,
      internalCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      serviceDate: new Date().toISOString().split('T')[0]
    });
    this.renderServices();
  }

  removeService(serviceId) {
    this.services = this.services.filter(s => s.id !== serviceId);
    this.renderServices();
    this.calculateTotal();
  }

  updateService(serviceId, field, value) {
    const service = this.services.find(s => s.id === serviceId);
    if (service) {
      service[field] = value;

      // Auto-populate from service catalog
      if (field === 'internalCode') {
        const claimType = document.getElementById('claimType')?.value;
        const catalogServices = this.availableServices[claimType] || [];
        const catalogService = catalogServices.find(s => s.internal_code === value);
        if (catalogService) {
          service.description = catalogService.description_en;
          service.unitPrice = catalogService.standard_price;
          service.sbsCode = catalogService.sbs_code;
        }
      }

      this.renderServices();
      this.calculateTotal();
    }
  }

  calculateTotal() {
    const total = this.services.reduce((sum, service) => {
      return sum + (service.unitPrice * service.quantity);
    }, 0);

    const totalElement = document.getElementById('claimTotal');
    if (totalElement) {
      totalElement.textContent = `${total.toFixed(2)} SAR`;
    }

    return total;
  }

  validateForm() {
    this.validationErrors = {};

    // Patient information
    const patientName = document.getElementById('patientName')?.value.trim();
    if (!patientName) {
      this.validationErrors.patientName = 'Patient name is required';
    }

    const patientId = document.getElementById('patientId')?.value.trim();
    if (!patientId) {
      this.validationErrors.patientId = 'Patient ID is required';
    } else if (!/^[12]\d{9}$/.test(patientId)) {
      this.validationErrors.patientId = 'Invalid Saudi ID format (10 digits starting with 1 or 2)';
    }

    const claimType = document.getElementById('claimType')?.value;
    if (!claimType) {
      this.validationErrors.claimType = 'Claim type is required';
    }

    const userEmail = document.getElementById('userEmail')?.value.trim();
    if (!userEmail) {
      this.validationErrors.userEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      this.validationErrors.userEmail = 'Invalid email format';
    }

    // Services validation
    if (this.services.length === 0) {
      this.validationErrors.services = 'At least one service is required';
    } else {
      this.services.forEach((service, index) => {
        if (!service.internalCode) {
          this.validationErrors[`service_${service.id}_code`] = `Service ${index + 1}: Code is required`;
        }
        if (!service.description) {
          this.validationErrors[`service_${service.id}_desc`] = `Service ${index + 1}: Description is required`;
        }
        if (service.quantity < 1) {
          this.validationErrors[`service_${service.id}_qty`] = `Service ${index + 1}: Quantity must be at least 1`;
        }
      });
    }

    // Diagnosis validation
    const diagnosisCode = document.getElementById('diagnosisCode')?.value;
    if (!diagnosisCode) {
      this.validationErrors.diagnosis = 'Diagnosis code is required';
    }

    this.renderValidationErrors();
    return Object.keys(this.validationErrors).length === 0;
  }

  renderValidationErrors() {
    // Clear all previous errors
    document.querySelectorAll('.validation-error').forEach(el => el.remove());
    document.querySelectorAll('.border-red-500').forEach(el => {
      el.classList.remove('border-red-500');
    });

    // Display new errors
    Object.entries(this.validationErrors).forEach(([field, message]) => {
      const fieldElement = document.getElementById(field);
      if (fieldElement) {
        fieldElement.classList.add('border-red-500');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error text-red-500 text-sm mt-1';
        errorDiv.textContent = message;
        fieldElement.parentNode.appendChild(errorDiv);
      }
    });

    // Show general services error
    if (this.validationErrors.services) {
      const servicesContainer = document.getElementById('servicesContainer');
      if (servicesContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error text-red-500 text-sm mb-2 p-2 bg-red-50 rounded';
        errorDiv.textContent = this.validationErrors.services;
        servicesContainer.insertBefore(errorDiv, servicesContainer.firstChild);
      }
    }
  }

  async submitClaim() {
    if (!this.validateForm()) {
      toast?.error('Please fix validation errors before submitting');
      return;
    }

    const formData = {
      patientName: document.getElementById('patientName').value.trim(),
      patientId: document.getElementById('patientId').value.trim(),
      memberId: document.getElementById('memberId').value.trim(),
      payerId: document.getElementById('payerId').value.trim() || 'DEFAULT_PAYER',
      providerId: document.getElementById('providerId').value.trim() || 'DEFAULT_PROVIDER',
      claimType: document.getElementById('claimType').value,
      userEmail: document.getElementById('userEmail').value.trim(),
      diagnosisCode: document.getElementById('diagnosisCode').value,
      diagnosisDisplay: document.getElementById('diagnosisCode').selectedOptions[0]?.text,
      services: this.services,
      totalAmount: this.calculateTotal(),
      submissionDate: new Date().toISOString()
    };

    // Show preview modal
    this.showPreviewModal(formData);
  }

  showPreviewModal(formData) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    // Sanitize user input to prevent XSS
    const sanitize = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-2xl font-bold text-gray-800">Review Claim Before Submission</h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- Patient Information -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
              <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Patient Information
            </h4>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-gray-600">Name:</span> <span class="font-medium">${sanitize(formData.patientName)}</span></div>
              <div><span class="text-gray-600">ID:</span> <span class="font-medium">${sanitize(formData.patientId)}</span></div>
              <div><span class="text-gray-600">Member ID:</span> <span class="font-medium">${sanitize(formData.memberId || 'N/A')}</span></div>
              <div><span class="text-gray-600">Claim Type:</span> <span class="font-medium capitalize">${sanitize(formData.claimType)}</span></div>
            </div>
          </div>

          <!-- Insurance Information -->
          <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Insurance Details
            </h4>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-gray-600">Payer:</span> <span class="font-medium">${sanitize(formData.payerId)}</span></div>
              <div><span class="text-gray-600">Provider:</span> <span class="font-medium">${sanitize(formData.providerId)}</span></div>
            </div>
          </div>

          <!-- Diagnosis -->
          <div class="bg-amber-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
              <svg class="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Diagnosis
            </h4>
            <div class="text-sm">
              <span class="font-medium">${sanitize(formData.diagnosisCode)}</span> - ${sanitize(formData.diagnosisDisplay)}
            </div>
          </div>

          <!-- Services -->
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
              <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
              Services (${formData.services.length})
            </h4>
            <div class="space-y-2">
              ${formData.services.map((service, index) => `
                <div class="bg-white p-3 rounded border border-green-200">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="font-medium text-gray-800">${sanitize(service.description)}</div>
                      <div class="text-sm text-gray-600">Code: ${sanitize(service.internalCode)}</div>
                      ${service.sbsCode ? `<div class="text-xs text-gray-500">SBS Code: ${sanitize(service.sbsCode)}</div>` : ''}
                      <div class="text-sm text-gray-600">Date: ${sanitize(service.serviceDate)}</div>
                    </div>
                    <div class="text-right ml-4">
                      <div class="text-sm text-gray-600">Qty: ${service.quantity}</div>
                      <div class="font-semibold text-gray-800">${(service.unitPrice * service.quantity).toFixed(2)} SAR</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Total -->
          <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-lg text-white">
            <div class="flex justify-between items-center">
              <span class="text-lg font-semibold">Total Amount (Base)</span>
              <span class="text-2xl font-bold">${formData.totalAmount.toFixed(2)} SAR</span>
            </div>
            <div class="text-sm mt-2 opacity-90">
              * Final amount will be calculated after applying facility tier markup and any applicable bundles
            </div>
          </div>
        </div>

        <div class="p-6 border-t border-gray-200 bg-gray-50">
          <div class="flex justify-end gap-3">
            <button onclick="this.closest('.fixed').remove()"
                    class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium">
              Cancel
            </button>
            <button id="confirmSubmitBtn"
                    class="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium">
              Confirm & Submit
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Attach submit handler
    document.getElementById('confirmSubmitBtn').addEventListener('click', async () => {
      modal.remove();
      await this.confirmSubmit(formData);
    });
  }

  async confirmSubmit(formData) {
    try {
      const submitBtn = document.getElementById('submitClaimBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Submitting...';
      }

      const apiBaseUrl = window.SBS_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/submit-claim-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast?.success(`Claim submitted successfully! Claim ID: ${data.claimId}`);

        // Redirect to tracking page
        setTimeout(() => {
          window.location.href = `/tracking.html?claimId=${data.claimId}`;
        }, 1500);
      } else {
        toast?.error(data.error || 'Failed to submit claim');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Submit Claim';
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast?.error('Network error. Please try again.');
      const submitBtn = document.getElementById('submitClaimBtn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Claim';
      }
    }
  }

  async generateTestClaim() {
    try {
      const claimType = document.getElementById('claimType')?.value || 'professional';
      const apiBaseUrl = window.SBS_API_BASE_URL || '';

      const response = await fetch(`${apiBaseUrl}/api/simulation/generate-test-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          claim_type: claimType,
          scenario: 'success',
          num_services: 2
        })
      });

      const data = await response.json();

      if (data.claim_data) {
        // Populate form with test data
        document.getElementById('patientName').value = data.claim_data.patientName;
        document.getElementById('patientId').value = data.claim_data.patientId;
        document.getElementById('memberId').value = data.claim_data.memberId;
        document.getElementById('payerId').value = data.claim_data.payerId;
        document.getElementById('providerId').value = data.claim_data.providerId;
        document.getElementById('userEmail').value = data.claim_data.userEmail;
        document.getElementById('diagnosisCode').value = data.claim_data.diagnosis.code;

        // Add services
        this.services = [];
        data.claim_data.services.forEach((service, index) => {
          const serviceId = ++this.serviceCounter;
          this.services.push({
            id: serviceId,
            internalCode: service.internal_code,
            description: service.description_en,
            quantity: 1,
            unitPrice: service.standard_price,
            sbsCode: service.sbs_code,
            serviceDate: data.claim_data.serviceDate.split('T')[0]
          });
        });

        this.renderServices();
        this.calculateTotal();

        toast?.success('Test claim data generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate test claim:', error);
      toast?.error('Failed to generate test claim');
    }
  }

  renderServices() {
    const container = document.getElementById('servicesContainer');
    if (!container) return;

    const claimType = document.getElementById('claimType')?.value;
    const availableServiceList = this.availableServices[claimType] || [];

    container.innerHTML = `
      <div class="space-y-4">
        ${this.services.map(service => `
          <div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div class="flex justify-between items-start mb-3">
              <h4 class="font-medium text-gray-800">Service #${service.id}</h4>
              <button onclick="claimForm.removeService(${service.id})"
                      class="text-red-500 hover:text-red-700 text-sm">
                Remove
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Service Code</label>
                <select id="service_${service.id}_code"
                        onchange="claimForm.updateService(${service.id}, 'internalCode', this.value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select Service</option>
                  ${availableServiceList.map(s => `
                    <option value="${s.internal_code}" ${service.internalCode === s.internal_code ? 'selected' : ''}>
                      ${s.internal_code} - ${s.description_en}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text"
                       id="service_${service.id}_description"
                       value="${service.description}"
                       onchange="claimForm.updateService(${service.id}, 'description', this.value)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Service description">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number"
                       id="service_${service.id}_quantity"
                       value="${service.quantity}"
                       min="1"
                       onchange="claimForm.updateService(${service.id}, 'quantity', parseInt(this.value))"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Unit Price (SAR)</label>
                <input type="number"
                       id="service_${service.id}_price"
                       value="${service.unitPrice}"
                       step="0.01"
                       min="0"
                       onchange="claimForm.updateService(${service.id}, 'unitPrice', parseFloat(this.value))"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
                <input type="date"
                       id="service_${service.id}_date"
                       value="${service.serviceDate}"
                       max="${new Date().toISOString().split('T')[0]}"
                       onchange="claimForm.updateService(${service.id}, 'serviceDate', this.value)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>

            ${service.sbsCode ? `
              <div class="mt-2 p-2 bg-green-100 text-green-800 text-sm rounded">
                ✓ Mapped to SBS Code: ${service.sbsCode}
              </div>
            ` : ''}
          </div>
        `).join('')}

        <button onclick="claimForm.addService()"
                class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-all font-medium">
          + Add Service
        </button>

        <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-lg text-white">
          <div class="flex justify-between items-center">
            <span class="text-lg font-semibold">Subtotal</span>
            <span id="claimTotal" class="text-2xl font-bold">0.00 SAR</span>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const container = document.getElementById('enhancedClaimFormContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Submit Enhanced Claim</h2>
            <button onclick="claimForm.generateTestClaim()"
                    class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors">
              Generate Test Data
            </button>
          </div>

          <form id="enhancedClaimForm" class="space-y-6">
            <!-- Patient Information Section -->
            <div class="border-b pb-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Patient Information</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="patientName" class="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                  <input type="text" id="patientName" required
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Ahmed Al-Rashid">
                </div>

                <div>
                  <label for="patientId" class="block text-sm font-medium text-gray-700 mb-1">Patient ID / Iqama *</label>
                  <input type="text" id="patientId" required pattern="[12]\\d{9}"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="1234567890">
                </div>

                <div>
                  <label for="memberId" class="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
                  <input type="text" id="memberId"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="MEM-123456">
                </div>

                <div>
                  <label for="userEmail" class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" id="userEmail" required
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="patient@example.com">
                </div>
              </div>
            </div>

            <!-- Insurance Information Section -->
            <div class="border-b pb-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Insurance Details</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="payerId" class="block text-sm font-medium text-gray-700 mb-1">Payer ID</label>
                  <input type="text" id="payerId"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="PAYER-NCCI-001">
                </div>

                <div>
                  <label for="providerId" class="block text-sm font-medium text-gray-700 mb-1">Provider ID</label>
                  <input type="text" id="providerId"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="PROV-KFMC-001">
                </div>

                <div>
                  <label for="claimType" class="block text-sm font-medium text-gray-700 mb-1">Claim Type *</label>
                  <select id="claimType" required onchange="claimForm.renderServices()"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select Type</option>
                    <option value="professional">Professional</option>
                    <option value="institutional">Institutional</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="vision">Vision</option>
                  </select>
                </div>

                <div>
                  <label for="diagnosisCode" class="block text-sm font-medium text-gray-700 mb-1">Diagnosis Code *</label>
                  <select id="diagnosisCode" required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select Diagnosis</option>
                    ${this.diagnosisCodes.map(diag => `
                      <option value="${diag.code}">${diag.code} - ${diag.display}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Services Section -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Services & Procedures</h3>
              <div id="servicesContainer"></div>
            </div>

            <!-- Submit Button -->
            <div class="pt-6">
              <button type="button" id="submitClaimBtn" onclick="claimForm.submitClaim()"
                      class="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-lg">
                Review & Submit Claim
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Initialize services
    this.renderServices();
  }

  attachEventListeners() {
    // Real-time validation
    const form = document.getElementById('enhancedClaimForm');
    if (form) {
      form.addEventListener('change', () => {
        this.validationErrors = {};
        this.renderValidationErrors();
      });
    }
  }
}

// Initialize global instance
let claimForm;
window.addEventListener('DOMContentLoaded', () => {
  claimForm = new EnhancedClaimForm();
});
