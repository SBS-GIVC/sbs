// Internationalization (i18n) - English and Arabic translations
export const i18n = {
  en: {
    title: "GIVC-SBS",
    tagline: "Global Integrated Virtual Care · Saudi Billing System",
    subtitle: "Powered by BrainSAITبرينسايت · Auth: Dr. Mohamed El Fadil",
    clinician: "Clinician",
    coder: "Medical Coder",
    validator: "Origin Validator",
    ambientStream: "Ambient Audio Stream",
    startAmbient: "Start AI Scribe",
    pauseSync: "Pause Sync",
    resumeListen: "Resume Listen",
    getInsights: "Clinical Insights ✨",
    generateNote: "Generate Note ✨",
    syncToCoder: "Sync to Coder Pipeline",
    rawTranscript: "Raw Encounter Transcript",
    structuredDoc: "Finalized Clinical Document",
    finalizing: "Executing AI Normalization...",
    normalize: "SBS Normalization",
    fhirBuild: "FHIR R4 Build",
    financials: "Financial Rules",
    nphiesGate: "NPHIES Gateway",
    mappingRationale: "SBS Mapping Rationale ✨",
    denialGuard: "Predictive Denial Prevention ✨",
    draftAppeal: "Generate Medical Justification ✨",
    archive: "Secure Submission Archive",
    accepted: "ACCEPTED",
    verified: "Verified Origin",
    sbsEngine: "Saudi Billing System (SBS)",
    liveSync: "NPHIES Live Sync",
    errorPipeline: "System Error: Pipeline execution interrupted.",
    waitingData: "Awaiting ambient dialogue input...",
    processEncounter: "Finalize doctor encounter to trigger coding pipeline.",
    poweredBy: "Powered by BrainSAITبرينسايت · Auth: Dr. Mohamed El Fadil",
    ui: {
      language: "العربية",
      searchPlaceholder: "Search claims, codes, and insights...",
      notifications: "Notifications",
      copilot: "AI Copilot",
      profile: "Profile"
    },
    nav: {
      sections: {
        nphies: "NPHIES Integration",
        code: "Code Management",
        ai: "AI Tools",
        system: "System"
      },
      items: {
        dashboard: "Dashboard",
        eligibility: "Eligibility",
        priorAuth: "Prior Auth",
        claimBuilder: "Claim Builder",
        claims: "Claims Queue",
        codeBrowser: "SBS Code Browser",
        unifiedBrowser: "Unified Browser",
        mappings: "Mappings",
        rulesEngine: "Rules Engine",
        aiHub: "AI Hub",
        analyticsHub: "Analytics Hub",
        predictiveAnalytics: "Predictive Analytics",
        iotDashboard: "IoT Dashboard",
        developerPortal: "Developer Portal",
        settings: "Settings",
        privacy: "Privacy & Consent",
        auditLog: "Audit Log"
      }
    },
    common: {
      required: "Required",
      optional: "Optional",
      loading: "Loading...",
      close: "Close",
      copy: "Copy",
      showRaw: "Show Raw",
      hideRaw: "Hide Raw",
      clear: "Clear",
      reset: "Reset",
      submit: "Submit",
      refresh: "Refresh",
      on: "On",
      off: "Off"
    },
    pages: {
      privacy: {
        title: "Privacy & Consent",
        subtitle: "How BrainSAIT handles sensitive healthcare data in the SBS portal.",
        badge: "Compliance",
        sections: {
          noticeTitle: "Important Notice",
          noticeBody: "This portal may process personal data and protected health information (PHI). Only use it when you have valid authorization and a legitimate operational need.",
          dataMinTitle: "Data Minimization",
          dataMinBody: "Collect and submit only the minimum required information needed to complete eligibility, prior authorization, and claims workflows.",
          encryptionTitle: "Encryption",
          encryptionBody: "All traffic should use TLS (HTTPS). Sensitive data at rest must be encrypted using industry-standard algorithms and key management practices.",
          accessTitle: "Access Controls",
          accessBody: "Use role-based access controls (RBAC) so only authorized staff can view or modify sensitive records. Prefer MFA for all accounts.",
          auditingTitle: "Audit Logging",
          auditingBody: "Administrative actions and sensitive workflow events should be logged for traceability and incident response.",
          retentionTitle: "Retention & Deletion",
          retentionBody: "Retain sensitive artifacts only as long as necessary. Remove or redact exports, screenshots, and downloaded documents when no longer needed.",
          contactTitle: "Security Contact",
          contactBody: "If you suspect a security incident, stop processing and notify your security operations owner immediately."
        }
      },
      adminAudit: {
        title: "Audit Log",
        subtitle: "Administrator view of security-relevant events and configuration changes.",
        badge: "Admin",
        tokenLabel: "Admin Token",
        tokenPlaceholder: "Paste Bearer token (optional if proxy auth is configured)",
        load: "Load Events",
        empty: "No events available yet.",
        columns: {
          time: "Time",
          type: "Type",
          actor: "Actor",
          detail: "Detail"
        }
      },
      eligibility: {
        header: {
          title: "Eligibility Verification",
          subtitle: "Validate patient coverage and benefit limits against national NPHIES databases in real-time.",
          badge: "Live Verification"
        },
        fields: {
          patientId: "Patient National ID / Iqama",
          insurer: "Insurance Provider",
          serviceDate: "Date of Service"
        },
        placeholders: {
          patientId: "e.g. 1029384756"
        },
        insurerOptions: {
          auto: "Auto-detect via NPHIES"
        },
        actions: {
          verify: "Verify Coverage",
          clear: "Clear"
        },
        consent: "By verifying coverage, you confirm you have patient authorization to access eligibility information.",
        validation: {
          patientIdRequired: "Patient National ID / Iqama is required.",
          patientIdInvalid: "Enter a valid 10-digit National ID / Iqama (numbers only)."
        },
        toast: {
          eligible: "Patient is eligible for coverage",
          ineligible: "Patient coverage not active",
          failed: "Verification failed. Please try again."
        }
      },
      priorAuth: {
        header: {
          title: "Prior Authorization",
          subtitle: "Manage pre-approvals for specialized medical procedures via NPHIES routing.",
          badge: "CHI v3.1 Compliant"
        },
        tabs: {
          new: "New Request",
          pending: "Pending",
          approved: "Approved",
          denied: "Denied",
          all: "Historical"
        },
        form: {
          title: "Create Authorization Request",
          subtitle: "Fill in the clinical details carefully to ensure higher approval odds.",
          patientId: "Patient Identity",
          patientName: "Full Legal Name",
          sbsSelection: "SBS Procedure Selection",
          estimated: "Estimated Cost (SAR)",
          expectedDate: "Expected Date",
          urgency: "Urgency Level",
          clinicalNotes: "Clinical Justification"
        },
        urgencyOptions: {
          routine: "Routine Care",
          urgent: "Urgent Case",
          emergency: "Life and Limb (Emergency)"
        },
        actions: {
          submit: "Submit Request",
          reset: "Reset",
          copyJson: "Copy JSON",
          checkStatus: "Check Status"
        },
        consent: "Ensure you have patient consent and facility authorization before submitting protected health information.",
        validation: {
          patientIdRequired: "Patient ID is required.",
          patientIdInvalid: "Enter a valid 10-digit Saudi ID / Iqama (numbers only).",
          sbsRequired: "Procedure code is required.",
          amountRequired: "Estimated amount is required.",
          amountInvalid: "Estimated amount must be greater than 0."
        },
        toast: {
          fixFields: "Please fix the highlighted fields",
          submitted: "Prior authorization submitted",
          copyOk: "Prior auth JSON copied",
          copyFail: "Copy failed (clipboard not available)"
        }
      },
      claimBuilder: {
        header: {
          title: "Smart Claim Builder",
          subtitle: "Autonomous billing engine with real-time NPHIES compliance and AI code optimization.",
          badge: "AI-V4 Powered"
        },
        steps: {
          identity: "Identity",
          services: "Services",
          review: "Review",
          relayed: "Relayed"
        },
        identity: {
          title: "Patient & Payer Context",
          subtitle: "Verified identities against national databases minimize claim rejection.",
          patientId: "Universal Patient ID",
          patientName: "Patient Full Name",
          email: "Contact Email",
          serviceDate: "Service Date",
          claimType: "Claim Type",
          proceed: "Validate Identity & Continue",
          consent: "Only access eligibility and submit claims when patient authorization is in place."
        },
        services: {
          title: "Service Orchestration",
          subtitle: "Add procedures, pharmaceuticals, or disposables to this claim session.",
          code: "SBS Code / Service Description",
          qty: "Quantity",
          unitPrice: "Unit Price (Estimated)",
          add: "Add to Session",
          payloadTitle: "Session Payload",
          netPrice: "Net Price",
          serviceInfo: "Service Info"
        },
        validation: {
          patientIdRequired: "Patient ID is required.",
          patientIdInvalid: "Enter a valid 10-digit Saudi ID / Iqama (numbers only).",
          emailInvalid: "Enter a valid email address (or leave blank).",
          itemCodeRequired: "Service code is required.",
          qtyInvalid: "Quantity must be greater than 0.",
          priceInvalid: "Unit price must be greater than 0."
        },
        toast: {
          enterPatientId: "Please enter patient ID",
          fixFields: "Please fix the highlighted fields",
          stagedLoaded: "Staged code loaded",
          bundleApplied: "Bundle applied",
          bundleCleared: "Bundle cleared",
          eligible: "Patient eligibility verified",
          ineligible: "Patient coverage not active",
          verifyFail: "Verification failed",
          searchUnavailable: "SBS code search is temporarily unavailable",
          submitted: "Claim submitted successfully",
          submissionFailed: "Submission failed"
        }
      },
      claimsQueue: {
        header: {
          title: "Claims Queue",
          subtitle: "Manage and triage real-time healthcare integration requests with autonomous validation.",
          badge: "V3.1 Relay"
        },
        filters: {
          all: "Total Workload",
          pending: "Pending",
          processing: "In-Process",
          relayed: "Relayed",
          rejected: "Rejected"
        },
        search: {
          label: "Search Claims",
          placeholder: "Deep search by claim ID, patient, or facility..."
        },
        actions: {
          autoRefreshOn: "Auto Refresh",
          autoRefreshOff: "Auto Refresh Off",
          refresh: "Refresh",
          create: "Create Claim",
          export: "Export Data",
          advanced: "Advanced Search"
        },
        toast: {
          statusRefreshed: "Status refreshed",
          statusRefreshFailed: "Status refresh failed",
          retryInitiated: "Retry initiated",
          retryFailed: "Retry failed",
          claimIdCopied: "Claim ID copied",
          copyFailed: "Copy failed",
          exportOk: "Queue exported"
        }
      },
      dashboard: {
        hero: {
          badge: "System Protocol 3.1 Active",
          titleLine1: "The Future of",
          titleLine2: "Clinical Relay",
          description:
            "Orchestrating the Saudi healthcare economy with adaptive AI, real-time NPHIES compliance, and autonomous revenue intelligence.",
          primaryCta: "New Claim Relay",
          secondaryCta: "Neural Insights"
        },
        toast: {
          sequenceInitiated: "Sequence initiated"
        },
        stats: {
          relayVolume: "Relay Volume",
          neuralSyncRate: "Neural Sync Rate",
          pendingTriage: "Pending Triage",
          networkUptime: "Network Uptime"
        },
        telemetry: {
          pulse: "System Pulse",
          stateOptimal: "OPTIMAL",
          avgLatency: "Avg Relay Latency"
        },
        operations: {
          title: "Live Operations Registry",
          subtitle: "Aggregated throughput from active clinical nodes.",
          filter: "System Filter",
          table: {
            entityCarrier: "Entity & Carrier",
            inferenceHub: "Inference Hub",
            neuralMarker: "Neural Marker",
            relayStatus: "Relay Status"
          },
          status: {
            authenticated: "Authenticated",
            inReview: "In-Review"
          }
        },
        advisor: {
          title: "Neural Deployment Ready",
          body:
            "Your local V3.1 inference models have reached 99.2% accuracy on staging. Ready for production synchronization.",
          button: "Sync Production Node"
        },
        integrity: {
          title: "System Integrity",
          nodes: {
            nphies: "NPHIES Cloud Node",
            rules: "SBS Rules Engine",
            grid: "AI Inference Grid",
            cache: "Local Cache Layer"
          },
          status: {
            highPriority: "High Priority",
            optimal: "Optimal",
            overload: "Overload"
          }
        },
        utilities: {
          codeRegistry: {
            title: "Code Registry",
            desc: "Unified access to SBS, ICD-10, and SNOMED-CT ontologies."
          },
          simulationLab: {
            title: "Simulation Lab",
            desc: "Validate complex claim scenarios in a sandboxed relay."
          },
          edgeMonitor: {
            title: "Edge Monitor",
            desc: "Real-time telemetry from clinical IoT integration nodes."
          }
        }
      },
      aiHub: {
        hero: {
          kicker: "Next-Gen Integration Intelligence",
          titleLine1: "The Pulse of",
          titleLine2: "Autonomous Billing",
          descriptionBeforeStrong:
            "Leverage specialized neural agents trained specifically on the Saudi SBS and NPHIES ecosystems. Guaranteed",
          descriptionStrong: "99.8% normalization accuracy",
          descriptionAfterStrong: "for enterprise health systems.",
          launchCopilot: "Launch Copilot",
          startAnalysis: "Start Analysis"
        },
        capabilities: {
          title: "Autonomous Capabilities",
          subtitle: "Specialized AI models designed for specific healthcare integration vectors."
        },
        features: {
          copilot: {
            title: "GIVC-SBS Copilot",
            description: "Neural billing assistant trained on SBS codes and CHI/NPHIES regulatory frameworks.",
            statsLabel: "Queries Handled",
            badge: "POPULAR"
          },
          analyzer: {
            title: "Claim Analyzer",
            description: "Predictive approval modeling with risk vector assessment and code optimization.",
            statsLabel: "Claims Analyzed",
            badge: "V4.0"
          },
          coder: {
            title: "Smart Code Mapper",
            description: "Autonomous mapping of legacy hospital codes to official SBS V3.1 standards.",
            statsLabel: "Codes Mapped"
          }
        },
        kpis: {
          accuracyLift: "Accuracy Lift",
          decisionSpeed: "Decision Speed",
          compliance: "Compliance",
          savingsYield: "Savings Yield"
        }
      },
      aiAnalytics: {
        header: {
          title: "Neural Analytics Hub",
          subtitle: "Autonomous claim profiling, risk assessment, and financial optimization engine.",
          badge: "Inference V4"
        },
        kpis: {
          registryVolume: "Registry Volume",
          syncSuccess: "Sync Success",
          totalFlux: "Total Flux",
          avgLatency: "Avg Latency",
          units: {
            claims: "Claims",
            seconds: "s"
          }
        },
        form: {
          title: "Input Manifest",
          subtitle: "Provide the clinical context for neural processing.",
          facilityId: "Facility ID",
          yieldValueSar: "Yield Value (SAR)",
          age: "Age",
          gender: "Gender",
          genderOptions: {
            male: "Male",
            female: "Female"
          },
          date: "Date",
          diagnosisRegistry: "Diagnosis Registry (ICD-10)",
          diagnosisPlaceholder: "I10, E11.9...",
          procedureCodes: "Procedure Codes (SBS)",
          procedurePlaceholder: "1101001..."
        },
        tabs: {
          predict: "Predict",
          optimize: "Optimize",
          fraud: "Fraud",
          compliance: "Safety",
          analyze: "Full Audit"
        },
        actions: {
          initialize: "Initialize Neural Sequence"
        },
        terminal: {
          title: "Inference Terminal",
          subtitle: "Standard output from the DeepSeek orchestration layer.",
          processing: "Processing Clinical Vectors...",
          statusLabel: "Autonomous status",
          statusFallback: "PROCESSED",
          riskMarker: "Risk Marker",
          recommendations: "Strategic Protocol Recommendations",
          awaiting: "Awaiting Input Sequence"
        },
        results: {
          approvalAnalysis: "Approval Analysis",
          yieldOptimization: "Yield Optimization",
          integrityAudit: "Integrity Audit",
          regulatorySafety: "Regulatory Safety"
        }
      },
      predictiveAnalytics: {
        header: {
          title: "Predictive Analytics",
          subtitle: "AI-powered forecasting for approvals, denials, and yield optimization.",
          badge: "Forecast V4"
        },
        actions: {
          neuralInsights: "Neural Insights",
          generating: "Generating..."
        },
        kpis: {
          claimsForecast: "Claims Forecast",
          confidenceRange: "Confidence Range",
          yieldProjection: "Yield Projection",
          capRecovery: "Cap Recovery",
          availableTrend: "AVAILABLE"
        },
        insights: {
          title: "AI Insights",
          source: "Generated by BrainSAIT AI"
        },
        charts: {
          trajectory: {
            title: "Approval Trajectory",
            subtitle: "Approved vs. denied volume across the selected time window."
          },
          legend: {
            success: "Approved",
            anomaly: "Denied",
            forecast: "Forecast"
          }
        },
        months: {
          aug: "Aug",
          sep: "Sep",
          oct: "Oct",
          nov: "Nov",
          dec: "Dec",
          jan: "Jan",
          forecast: "Forecast"
        },
        denials: {
          title: "Denial Vectors",
          subtitle: "Top denial drivers across the network.",
          critical: "CRITICAL: Prior Auth Required is trending up",
          reasons: {
            missingDocumentation: "Missing documentation",
            invalidSbsCode: "Invalid SBS code",
            priorAuthRequired: "Prior auth required",
            coverageExpired: "Coverage expired",
            duplicateClaim: "Duplicate claim"
          }
        },
        payers: {
          title: "Payer Performance",
          subtitle: "Approval rate and average decision time by payer.",
          days: "days"
        },
        risk: {
          title: "Risk Composite",
          subtitle: "Denial risk and volatility window for the next cycle.",
          composite: "Composite Risk",
          minimal: "MINIMAL",
          low: "Low",
          window: "Volatility",
          critical: "Critical"
        },
        loading: {
          title: "Loading Forecast",
          subtitle: "Compiling predictive vectors..."
        }
      },
      settings: {
        header: {
          title: "System Configuration",
          subtitle: "Fine-tune your GIVC-SBS environment, security parameters, and autonomous relay logic.",
          badge: "Security Gate"
        },
        operationalLogic: {
          title: "Operational Logic",
          subtitle: "Manage how the relay handles autonomous decision making.",
          autonomousMapping: {
            label: "Autonomous Mapping",
            desc: "Automatically synchronize claims that exceed the neural confidence threshold."
          },
          confidenceThreshold: {
            label: "Confidence Threshold",
            hint: "Minimum marker for auto-triage"
          }
        },
        connectivity: {
          title: "Gateway Connectivity",
          subtitle: "Manage your production endpoints and security keys.",
          n8nWebhook: {
            label: "n8n Relay Webhook",
            placeholder: "https://n8n.brainsait.cloud/..."
          },
          nphiesEnv: {
            label: "NPHIES Environment",
            options: {
              production: "Production Node",
              sandbox: "Developer Sandbox",
              uat: "UAT Staging"
            }
          },
          warning: "Changing the NPHIES environment will invalidate current session tokens and requires a full security re-handshake."
        },
        preferences: {
          title: "Interface Preferences",
          luminanceProfile: {
            label: "Luminance Profile",
            desc: "Switch between specialized high-contrast dark mode and clinical light mode."
          },
          dispatchNotifications: {
            label: "Dispatch Notifications",
            desc: "Receive real-time relay failure alerts via encrypted email channels."
          }
        },
        actions: {
          factoryReset: "Factory Reset Configuration",
          discard: "Discard",
          commit: "Commit Changes"
        },
        toast: {
          factoryReset: "Factory reset requires admin confirmation",
          discarded: "Changes discarded",
          committed: "Settings committed successfully"
        }
      },
      codeBrowser: {
        header: {
          title: "Terminology Explorer",
          subtitleTemplate: "Global registry of {count} individual SBS clinical markers.",
          badge: "Knowledge Graph"
        },
        view: {
          grid: "Grid Matrix",
          condensed: "Condensed"
        },
        search: {
          label: "Search SBS catalogue",
          placeholder: "Search by ID, semantics, or clinical description..."
        },
        category: {
          label: "Category"
        },
        loading: {
          catalog: "Loading official SBS catalogue..."
        },
        empty: "No clinical markers found",
        detail: {
          kicker: "Registry Detail",
          close: "Close detail panel",
          technical: "Technical Designation",
          domain: "Domain Classification",
          fallbackCategory: "Clinical General",
          neuralCrossRef: "Neural Cross-Reference",
          approvalConfidence: "Approval Confidence",
          deepSeekLead: "DeepSeek inference suggests high correlation with",
          deepSeekCode: "ICD-10 M17.0",
          deepSeekTail: "diagnostic pathways."
        },
        actions: {
          enroll: "Enroll in Workspace",
          copyId: "Copy Entity ID"
        },
        cell: {
          copyAriaTemplate: "Copy {code}",
          fallbackCategory: "Clinical"
        },
        toast: {
          catalogUnavailable: "SBS catalogue is temporarily unavailable",
          codeCopied: "Code {code} synchronized to clipboard",
          clipboardDenied: "Clipboard access denied by browser",
          staged: "Code staged for Claim Builder"
        }
      },
      unifiedBrowser: {
        header: {
          title: "Unified Registry",
          subtitleTemplate: "Autonomous search across {count} global healthcare systems.",
          badge: "Network Node",
          tags: {
            fhir: "FHIR R4 Native",
            ai: "AI Enhanced"
          }
        },
        search: {
          label: "Search clinical ontologies",
          placeholder: "Query across clinical ontologies (e.g. 'cardiology', 'glucose', 'I10')..."
        },
        systems: {
          codes: "Codes"
        },
        empty: "Registry Query Null",
        result: {
          ariaLabelTemplate: "Open {system} {code}"
        },
        detail: {
          close: "Close detail panel",
          semantics: "Semantics",
          statusLabel: "Status",
          statusActive: "Active",
          authReqLabel: "Auth Req",
          authReqManual: "Manual",
          bridgingTitle: "System Bridging",
          bridgingSubtitle: "Cross-system neural mappings.",
          match: "Match"
        },
        actions: {
          addContext: "Add to Claim Context",
          deepLink: "Registry Deep-Link"
        },
        toast: {
          codeCopied: "{system} code synchronized",
          clipboardDenied: "Clipboard access denied by browser",
          contextAdded: "Code context added and claim builder opened",
          openedReference: "Opened registry reference in a new tab"
        }
      },
      mappings: {
        header: {
          title: "Claims Mapping Analytics",
          subtitle: "Deep inspection of live normalization telemetry, overrides, and mismatch vectors.",
          badgeLoading: "Booting Telemetry",
          badgeLive: "Live Intelligence"
        },
        stats: {
          mappingsObserved: "Mappings Observed",
          autoAcceptRate: "Auto-Accept Rate",
          avgConfidenceSuffix: "avg conf",
          reviewQueue: "Review Queue",
          uniqueSuffix: "unique",
          p95Latency: "P95 Latency",
          avgLatencySuffix: "avg"
        },
        actions: {
          configureRules: "Configure Rules",
          openReviewQueue: "Open Review Queue",
          refresh: "Refresh"
        },
        lastEvent: "last event:",
        charts: {
          transformationAccuracy: {
            title: "Transformation Accuracy",
            subtitle: "Daily volume and average confidence from the live normalization stream."
          },
          legend: {
            volume: "Volume",
            avgConfidence: "Avg Confidence"
          },
          daily: {
            loading: "Loading Telemetry",
            empty: "No Daily Series Yet"
          }
        },
        facilities: {
          title: "Facility Leaderboard",
          subtitle: "Top facilities by mapping volume (live telemetry window).",
          table: {
            facility: "Facility",
            volume: "Volume",
            avgConfidence: "Avg Confidence",
            overrides: "Overrides"
          },
          row: {
            facilityLabel: "Facility #{id}",
            nodeLabel: "Node {id}"
          },
          empty: {
            loading: "Loading telemetry...",
            noData: "No mapping events captured yet. Trigger a normalization call to populate telemetry."
          }
        },
        anomalies: {
          title: "Anomaly Vectors",
          subtitle: "Mismatch and override signals detected in the telemetry window.",
          totalFlags: "Total Flags",
          items: {
            noMatch: "No Match / Passthrough",
            rejectedLowConf: "Rejected (Low Confidence)",
            overrideHits: "Override Hits"
          }
        },
        aiAudit: {
          title: "AI Audit Ready",
          bodyLead: "Governance is live. Overrides configured:",
          button: "Review Governance"
        }
      },
      mappingRules: {
        header: {
          title: "Orchestration Rules",
          subtitle: "Configure confidence thresholds and facility overrides for normalization governance.",
          badgeLoading: "Loading",
          badgeLive: "Governance Engine"
        },
        actions: {
          versionHistory: "Version History",
          reset: "Node Reset",
          save: "Save Profile"
        },
        thresholds: {
          title: "Global Logic Thresholds",
          subtitle: "Confidence markers that dictate autonomous relay behavior.",
          autoAccept: {
            label: "Auto-Accept Marker",
            hint: "Payloads exceeding this marker bypass manual triage."
          },
          reviewTrigger: {
            label: "Review Trigger",
            hint: "Minimum marker required for AI-suggested candidates."
          },
          infoTemplate:
            "Claims between {review}% and {auto}% are queued for expert verification. Payloads below {review}% can be treated as rejected by governance."
        },
        heuristics: {
          title: "Operational Heuristics",
          subtitle: "Feature toggles recorded into governance config.",
          toggles: {
            fuzzy: {
              label: "Fuzzy Normalization",
              desc: "Enable semantic matching for unstructured clinical shorthand."
            },
            universal: {
              label: "Universal SBS Priority",
              desc: "Prefer Saudi-specific V3.1 code systems during conflicts."
            },
            icd10: {
              label: "Strict ICD-10 Enforcement",
              desc: "Reject claims missing secondary diagnostic validation."
            }
          }
        },
        overrides: {
          title: "Entity Overrides",
          subtitle: "Facility-specific overrides (server-enforced during /api/normalize).",
          add: "Add Override",
          editor: {
            facilityId: "Facility ID",
            confidence: "Confidence (0-1)",
            internalCode: "Internal Code",
            mappedSbsCode: "Mapped SBS Code",
            description: "Description",
            notes: "Notes",
            cancel: "Cancel",
            save: "Save Override"
          },
          table: {
            facility: "Facility",
            internal: "Internal",
            sbs: "SBS",
            conf: "Conf",
            loading: "Loading overrides...",
            empty: "No overrides configured."
          },
          row: {
            delete: "Delete override"
          }
        },
        simulator: {
          title: "Neural Simulator",
          subtitle: "Validate rules against /api/normalize with the current governance profile.",
          resolutionError: "Resolution Error",
          decisions: {
            autoAccepted: "Auto-Accepted",
            reviewRequired: "Review Required",
            rejected: "Rejected"
          },
          fields: {
            facilityId: "Facility ID",
            internalCode: "Internal Code",
            description: "Description",
            descriptionPlaceholder: "Describe a clinical service..."
          },
          actions: {
            simulate: "Simulate"
          },
          output: {
            predicted: "Predicted Normalization",
            sourceLabel: "Source",
            confidenceLabel: "Confidence",
            resultLabel: "Result"
          }
        },
        toast: {
          loadConfigFailed: "Failed to load mapping config",
          loadOverridesFailed: "Failed to load overrides",
          profileSaved: "Governance profile saved",
          saveConfigFailed: "Failed to save config",
          defaultStaged: "Default profile staged (save to apply)",
          overrideRequired: "Internal code and SBS code are required",
          overrideSaved: "Override saved",
          overrideSaveFailed: "Override save failed",
          overrideDeleted: "Override deleted",
          deleteFailed: "Delete failed",
          internalCodeRequired: "Internal code is required",
          versionHistoryUnavailable: "Version history is not configured in this deployment"
        }
      }
    }
  },
  ar: {
    title: "GIVC-SBS",
    tagline: "الرعاية الافتراضية المتكاملة عالمياً · نظام الفوترة السعودي",
    subtitle: "ذكاء الرعاية الافتراضية المتكامل",
    clinician: "الممارس الصحي",
    coder: "الترميز الطبي",
    validator: "مدقق المنشأ",
    ambientStream: "البث الصوتي المحيطي",
    startAmbient: "بدء التدوين الذكي",
    pauseSync: "إيقاف المزامنة",
    resumeListen: "استئناف الاستماع",
    getInsights: "رؤى سريرية ✨",
    generateNote: "إنشاء التقرير ✨",
    syncToCoder: "مزامنة للمرمّز",
    rawTranscript: "النص الخام للمقابلة",
    structuredDoc: "الوثيقة السريرية المهيكلة",
    finalizing: "جاري المعالجة والمزامنة...",
    normalize: "معايرة SBS",
    fhirBuild: "بناء FHIR R4",
    financials: "القواعد المالية",
    nphiesGate: "بوابة نفيس",
    mappingRationale: "مبررات ترميز SBS ✨",
    denialGuard: "الوقاية الاستباقية من الرفض ✨",
    draftAppeal: "إنشاء التبرير الطبي ✨",
    archive: "أرشيف المطالبات الموثق",
    accepted: "تم القبول",
    verified: "منشأ موثق",
    sbsEngine: "نظام الفوترة السعودي (SBS)",
    liveSync: "مزامنة نفيس الحية",
    errorPipeline: "خطأ في النظام: تعذر إكمال المعالجة.",
    waitingData: "في انتظار الحوار السريري...",
    processEncounter: "قم بإنهاء معاينة الطبيب لبدء عملية الترميز.",
    poweredBy: "Powered by BrainSAITبرينسايت · Auth: Dr. Mohamed El Fadil",
    ui: {
      language: "English",
      searchPlaceholder: "ابحث في المطالبات والأكواد والتحليلات...",
      notifications: "الإشعارات",
      copilot: "المساعد الذكي",
      profile: "الملف الشخصي"
    },
    nav: {
      sections: {
        nphies: "تكامل نفيس",
        code: "إدارة الأكواد",
        ai: "أدوات الذكاء الاصطناعي",
        system: "النظام"
      },
      items: {
        dashboard: "لوحة التحكم",
        eligibility: "الاستحقاق",
        priorAuth: "الموافقة المسبقة",
        claimBuilder: "منشئ المطالبة",
        claims: "قائمة المطالبات",
        codeBrowser: "متصفح أكواد SBS",
        unifiedBrowser: "المتصفح الموحد",
        mappings: "الربط",
        rulesEngine: "محرك القواعد",
        aiHub: "مركز الذكاء",
        analyticsHub: "مركز التحليلات",
        predictiveAnalytics: "التحليلات التنبؤية",
        iotDashboard: "لوحة إنترنت الأشياء",
        developerPortal: "بوابة المطور",
        settings: "الإعدادات",
        privacy: "الخصوصية والموافقة",
        auditLog: "سجل التدقيق"
      }
    },
    common: {
      required: "إلزامي",
      optional: "اختياري",
      loading: "جارٍ التحميل...",
      close: "إغلاق",
      copy: "نسخ",
      showRaw: "عرض الخام",
      hideRaw: "إخفاء الخام",
      clear: "مسح",
      reset: "إعادة ضبط",
      submit: "إرسال",
      refresh: "تحديث",
      on: "تشغيل",
      off: "إيقاف"
    },
    pages: {
      privacy: {
        title: "الخصوصية والموافقة",
        subtitle: "كيف يتعامل BrainSAIT مع بيانات الرعاية الصحية الحساسة داخل بوابة SBS.",
        badge: "الامتثال",
        sections: {
          noticeTitle: "تنبيه مهم",
          noticeBody: "قد تعالج هذه البوابة بيانات شخصية ومعلومات صحية محمية. استخدمها فقط عند وجود تفويض صالح واحتياج تشغيلي مشروع.",
          dataMinTitle: "تقليل البيانات",
          dataMinBody: "اجمع وأرسل الحد الأدنى من المعلومات اللازمة لإتمام الاستحقاق والموافقة المسبقة وإجراءات المطالبات.",
          encryptionTitle: "التشفير",
          encryptionBody: "يجب أن يكون الاتصال عبر TLS (HTTPS). يجب تشفير البيانات الحساسة المخزنة باستخدام خوارزميات ومعايير إدارة مفاتيح معتمدة.",
          accessTitle: "ضوابط الوصول",
          accessBody: "استخدم التحكم بالوصول حسب الدور (RBAC) لضمان أن الموظفين المخولين فقط يمكنهم عرض أو تعديل البيانات الحساسة. يفضّل تفعيل MFA لجميع الحسابات.",
          auditingTitle: "سجل التدقيق",
          auditingBody: "يجب تسجيل إجراءات الإدارة وأحداث سير العمل الحساسة لضمان التتبع والاستجابة للحوادث.",
          retentionTitle: "الاحتفاظ والحذف",
          retentionBody: "احتفظ بالملفات الحساسة فقط للمدة اللازمة. احذف أو قم بإخفاء البيانات من الصادرات ولقطات الشاشة والمستندات المحملة عند عدم الحاجة.",
          contactTitle: "جهة اتصال أمنية",
          contactBody: "إذا اشتبهت بحادث أمني، أوقف المعالجة فوراً وأبلغ مسؤول أمن المعلومات لديك."
        }
      },
      adminAudit: {
        title: "سجل التدقيق",
        subtitle: "عرض إداري للأحداث ذات الصلة بالأمن وتغييرات الإعدادات.",
        badge: "مسؤول",
        tokenLabel: "رمز المسؤول",
        tokenPlaceholder: "ألصق رمز Bearer (اختياري إذا كان المصادقة عبر البروكسي مفعلة)",
        load: "تحميل الأحداث",
        empty: "لا توجد أحداث بعد.",
        columns: {
          time: "الوقت",
          type: "النوع",
          actor: "المنفذ",
          detail: "التفاصيل"
        }
      },
      eligibility: {
        header: {
          title: "التحقق من الاستحقاق",
          subtitle: "تحقق من تغطية المريض وحدود المنافع عبر قواعد نفيس بشكل لحظي.",
          badge: "تحقق مباشر"
        },
        fields: {
          patientId: "الهوية الوطنية / الإقامة",
          insurer: "شركة التأمين",
          serviceDate: "تاريخ الخدمة"
        },
        placeholders: {
          patientId: "مثال: 1029384756"
        },
        insurerOptions: {
          auto: "اكتشاف تلقائي عبر نفيس"
        },
        actions: {
          verify: "تحقق من التغطية",
          clear: "مسح"
        },
        consent: "بإجراء التحقق، تؤكد أن لديك تفويضاً من المريض للوصول إلى معلومات الاستحقاق.",
        validation: {
          patientIdRequired: "الهوية الوطنية/الإقامة مطلوبة.",
          patientIdInvalid: "أدخل رقماً صحيحاً مكوناً من 10 أرقام (أرقام فقط)."
        },
        toast: {
          eligible: "المريض مؤهل للتغطية",
          ineligible: "تغطية المريض غير نشطة",
          failed: "فشل التحقق. حاول مرة أخرى."
        }
      },
      priorAuth: {
        header: {
          title: "الموافقة المسبقة",
          subtitle: "إدارة طلبات الموافقة المسبقة للإجراءات الطبية عبر مسارات نفيس.",
          badge: "متوافق مع CHI v3.1"
        },
        tabs: {
          new: "طلب جديد",
          pending: "قيد الانتظار",
          approved: "موافق عليه",
          denied: "مرفوض",
          all: "سجل سابق"
        },
        form: {
          title: "إنشاء طلب موافقة مسبقة",
          subtitle: "أدخل التفاصيل السريرية بعناية لزيادة فرص الموافقة.",
          patientId: "هوية المريض",
          patientName: "الاسم القانوني الكامل",
          sbsSelection: "اختيار إجراء SBS",
          estimated: "التكلفة التقديرية (ريال)",
          expectedDate: "التاريخ المتوقع",
          urgency: "درجة الاستعجال",
          clinicalNotes: "التبرير الطبي"
        },
        urgencyOptions: {
          routine: "رعاية روتينية",
          urgent: "حالة عاجلة",
          emergency: "طارئ (إنقاذ حياة)"
        },
        actions: {
          submit: "إرسال الطلب",
          reset: "إعادة ضبط",
          copyJson: "نسخ JSON",
          checkStatus: "تحقق من الحالة"
        },
        consent: "تأكد من وجود موافقة المريض وتفويض المنشأة قبل إرسال معلومات صحية محمية.",
        validation: {
          patientIdRequired: "هوية المريض مطلوبة.",
          patientIdInvalid: "أدخل رقم هوية/إقامة صحيحاً مكوناً من 10 أرقام (أرقام فقط).",
          sbsRequired: "رمز الإجراء مطلوب.",
          amountRequired: "المبلغ التقديري مطلوب.",
          amountInvalid: "يجب أن يكون المبلغ التقديري أكبر من 0."
        },
        toast: {
          fixFields: "يرجى تصحيح الحقول المميزة",
          submitted: "تم إرسال طلب الموافقة المسبقة",
          copyOk: "تم نسخ JSON",
          copyFail: "فشل النسخ (الحافظة غير متاحة)"
        }
      },
      claimBuilder: {
        header: {
          title: "منشئ المطالبة الذكي",
          subtitle: "محرك فوترة ذاتي مع امتثال نفيس وتحسين أكواد بالذكاء الاصطناعي.",
          badge: "مدعوم بالذكاء"
        },
        steps: {
          identity: "الهوية",
          services: "الخدمات",
          review: "مراجعة",
          relayed: "تم الإرسال"
        },
        identity: {
          title: "بيانات المريض والجهة الدافعة",
          subtitle: "التحقق من الهوية يقلل من رفض المطالبات.",
          patientId: "هوية المريض الموحدة",
          patientName: "اسم المريض الكامل",
          email: "البريد الإلكتروني",
          serviceDate: "تاريخ الخدمة",
          claimType: "نوع المطالبة",
          proceed: "تحقق من الهوية والمتابعة",
          consent: "لا تقم بالتحقق أو إرسال المطالبة إلا بوجود تفويض من المريض."
        },
        services: {
          title: "إدارة الخدمات",
          subtitle: "أضف الإجراءات أو الأدوية أو المستلزمات إلى جلسة المطالبة.",
          code: "رمز SBS / وصف الخدمة",
          qty: "الكمية",
          unitPrice: "سعر الوحدة (تقديري)",
          add: "إضافة إلى الجلسة",
          payloadTitle: "حمولة الجلسة",
          netPrice: "السعر الصافي",
          serviceInfo: "معلومات الخدمة"
        },
        validation: {
          patientIdRequired: "هوية المريض مطلوبة.",
          patientIdInvalid: "أدخل رقم هوية/إقامة صحيحاً مكوناً من 10 أرقام (أرقام فقط).",
          emailInvalid: "أدخل بريداً إلكترونياً صحيحاً (أو اتركه فارغاً).",
          itemCodeRequired: "رمز الخدمة مطلوب.",
          qtyInvalid: "يجب أن تكون الكمية أكبر من 0.",
          priceInvalid: "يجب أن يكون سعر الوحدة أكبر من 0."
        },
        toast: {
          enterPatientId: "يرجى إدخال هوية المريض",
          fixFields: "يرجى تصحيح الحقول المميزة",
          stagedLoaded: "تم تحميل الرمز",
          bundleApplied: "تم تطبيق الباقة",
          bundleCleared: "تم إلغاء الباقة",
          eligible: "تم التحقق من الاستحقاق",
          ineligible: "تغطية المريض غير نشطة",
          verifyFail: "فشل التحقق",
          searchUnavailable: "بحث الأكواد غير متاح مؤقتاً",
          submitted: "تم إرسال المطالبة بنجاح",
          submissionFailed: "فشل إرسال المطالبة"
        }
      },
      claimsQueue: {
        header: {
          title: "طابور المطالبات",
          subtitle: "إدارة وفرز المطالبات اللحظية مع التحقق الذاتي.",
          badge: "ترحيل V3.1"
        },
        filters: {
          all: "إجمالي الحمل",
          pending: "معلقة",
          processing: "قيد المعالجة",
          relayed: "تم الترحيل",
          rejected: "مرفوضة"
        },
        search: {
          label: "بحث المطالبات",
          placeholder: "ابحث برقم المطالبة أو المريض أو المنشأة..."
        },
        actions: {
          autoRefreshOn: "تحديث تلقائي",
          autoRefreshOff: "إيقاف التحديث",
          refresh: "تحديث",
          create: "إنشاء مطالبة",
          export: "تصدير البيانات",
          advanced: "بحث متقدم"
        },
        toast: {
          statusRefreshed: "تم تحديث الحالة",
          statusRefreshFailed: "فشل تحديث الحالة",
          retryInitiated: "تم بدء إعادة المحاولة",
          retryFailed: "فشلت إعادة المحاولة",
          claimIdCopied: "تم نسخ رقم المطالبة",
          copyFailed: "فشل النسخ",
          exportOk: "تم تصدير القائمة"
        }
      },
      dashboard: {
        hero: {
          badge: "بروتوكول النظام 3.1 نشط",
          titleLine1: "مستقبل",
          titleLine2: "الترحيل السريري",
          description:
            "ننسق اقتصاد الرعاية الصحية في السعودية عبر ذكاء اصطناعي تكيفي، وامتثال نفيس لحظياً، وذكاء إيرادات ذاتي.",
          primaryCta: "ترحيل مطالبة جديدة",
          secondaryCta: "رؤى ذكية"
        },
        toast: {
          sequenceInitiated: "تم بدء العملية"
        },
        stats: {
          relayVolume: "حجم الترحيل",
          neuralSyncRate: "معدل المزامنة الذكية",
          pendingTriage: "فرز معلق",
          networkUptime: "توفر الشبكة"
        },
        telemetry: {
          pulse: "نبض النظام",
          stateOptimal: "مثالي",
          avgLatency: "متوسط زمن الترحيل"
        },
        operations: {
          title: "سجل العمليات المباشرة",
          subtitle: "إجمالي السعة من العقد السريرية النشطة.",
          filter: "تصفية النظام",
          table: {
            entityCarrier: "المنشأة وشركة التأمين",
            inferenceHub: "مركز الاستدلال",
            neuralMarker: "المؤشر الذكي",
            relayStatus: "حالة الترحيل"
          },
          status: {
            authenticated: "تمت المصادقة",
            inReview: "قيد المراجعة"
          }
        },
        advisor: {
          title: "جاهز للنشر الذكي",
          body:
            "نماذج الاستدلال V3.1 المحلية وصلت إلى دقة 99.2% على بيئة الاختبار. جاهزة للمزامنة إلى الإنتاج.",
          button: "مزامنة عقدة الإنتاج"
        },
        integrity: {
          title: "سلامة النظام",
          nodes: {
            nphies: "عقدة نفيس السحابية",
            rules: "محرك قواعد SBS",
            grid: "شبكة الاستدلال الذكي",
            cache: "طبقة التخزين المؤقت"
          },
          status: {
            highPriority: "أولوية عالية",
            optimal: "مثالي",
            overload: "تحميل زائد"
          }
        },
        utilities: {
          codeRegistry: {
            title: "سجل الأكواد",
            desc: "وصول موحد إلى أكواد SBS و ICD-10 و SNOMED-CT."
          },
          simulationLab: {
            title: "مختبر المحاكاة",
            desc: "تحقق من سيناريوهات مطالبات معقدة داخل بيئة معزولة."
          },
          edgeMonitor: {
            title: "مراقبة الحافة",
            desc: "قياس لحظي لعقد إنترنت الأشياء السريرية."
          }
        }
      },
      aiHub: {
        hero: {
          kicker: "ذكاء تكامل متقدم",
          titleLine1: "نبض",
          titleLine2: "الفوترة الذاتية",
          descriptionBeforeStrong:
            "استفد من وكلاء ذكاء اصطناعي متخصصين ومدربين خصيصاً على نظام SBS السعودي وبيئة نفيس. دقة معايرة مضمونة تصل إلى",
          descriptionStrong: "99.8%",
          descriptionAfterStrong: "للمنشآت الصحية المؤسسية.",
          launchCopilot: "تشغيل المساعد",
          startAnalysis: "بدء التحليل"
        },
        capabilities: {
          title: "القدرات الذاتية",
          subtitle: "نماذج ذكاء اصطناعي متخصصة مصممة لمجالات محددة في تكامل الرعاية الصحية."
        },
        features: {
          copilot: {
            title: "مساعد GIVC-SBS",
            description: "مساعد فوترة ذكي مدرب على أكواد SBS وأطر CHI/NPHIES التنظيمية.",
            statsLabel: "الاستفسارات المنجزة",
            badge: "شائع"
          },
          analyzer: {
            title: "محلل المطالبات",
            description: "نمذجة تنبؤية للموافقة مع تقييم المخاطر وتحسين الأكواد.",
            statsLabel: "مطالبات محللة",
            badge: "V4.0"
          },
          coder: {
            title: "مُطابق الأكواد الذكي",
            description: "ربط تلقائي لأكواد المنشآت القديمة مع معايير SBS V3.1 الرسمية.",
            statsLabel: "أكواد مرتبطة"
          }
        },
        kpis: {
          accuracyLift: "تحسن الدقة",
          decisionSpeed: "سرعة القرار",
          compliance: "الامتثال",
          savingsYield: "عائد التوفير"
        }
      },
      aiAnalytics: {
        header: {
          title: "مركز التحليلات الذكية",
          subtitle: "تحليل ذاتي للمطالبات وتقييم المخاطر وتحسين العوائد المالية.",
          badge: "استدلال V4"
        },
        kpis: {
          registryVolume: "حجم السجل",
          syncSuccess: "نجاح المزامنة",
          totalFlux: "إجمالي التدفق",
          avgLatency: "متوسط الزمن",
          units: {
            claims: "مطالبات",
            seconds: "ث"
          }
        },
        form: {
          title: "بيانات الإدخال",
          subtitle: "قدم السياق السريري للمعالجة الذكية.",
          facilityId: "معرف المنشأة",
          yieldValueSar: "قيمة المبلغ (ريال)",
          age: "العمر",
          gender: "الجنس",
          genderOptions: {
            male: "ذكر",
            female: "أنثى"
          },
          date: "التاريخ",
          diagnosisRegistry: "سجل التشخيص (ICD-10)",
          diagnosisPlaceholder: "I10, E11.9...",
          procedureCodes: "أكواد الإجراءات (SBS)",
          procedurePlaceholder: "1101001..."
        },
        tabs: {
          predict: "تنبؤ",
          optimize: "تحسين",
          fraud: "احتيال",
          compliance: "سلامة",
          analyze: "تدقيق شامل"
        },
        actions: {
          initialize: "بدء التسلسل الذكي"
        },
        terminal: {
          title: "طرفية الاستدلال",
          subtitle: "مخرجات طبقة DeepSeek للتنسيق.",
          processing: "جارٍ معالجة المتجهات السريرية...",
          statusLabel: "الحالة الذاتية",
          statusFallback: "تمت المعالجة",
          riskMarker: "مؤشر المخاطر",
          recommendations: "توصيات البروتوكول",
          awaiting: "بانتظار تسلسل الإدخال"
        },
        results: {
          approvalAnalysis: "تحليل الموافقة",
          yieldOptimization: "تحسين العائد",
          integrityAudit: "تدقيق النزاهة",
          regulatorySafety: "السلامة التنظيمية"
        }
      },
      predictiveAnalytics: {
        header: {
          title: "التحليلات التنبؤية",
          subtitle: "توقعات مدعومة بالذكاء الاصطناعي للموافقات والرفض وتحسين العائد.",
          badge: "محرك التوقع V4"
        },
        actions: {
          neuralInsights: "رؤى تنبؤية",
          generating: "جارٍ التوليد..."
        },
        kpis: {
          claimsForecast: "توقع المطالبات",
          confidenceRange: "نطاق الثقة",
          yieldProjection: "توقع العائد",
          capRecovery: "استرداد العائد",
          availableTrend: "متاح"
        },
        insights: {
          title: "رؤى الذكاء الاصطناعي",
          source: "مولدة بواسطة BrainSAIT AI"
        },
        charts: {
          trajectory: {
            title: "مسار الموافقات",
            subtitle: "حجم المقبول مقابل المرفوض خلال الفترة المحددة."
          },
          legend: {
            success: "مقبول",
            anomaly: "مرفوض",
            forecast: "توقع"
          }
        },
        months: {
          aug: "أغسطس",
          sep: "سبتمبر",
          oct: "أكتوبر",
          nov: "نوفمبر",
          dec: "ديسمبر",
          jan: "يناير",
          forecast: "توقع"
        },
        denials: {
          title: "أسباب الرفض",
          subtitle: "أبرز محركات الرفض عبر الشبكة.",
          critical: "حرج: اتجاه «تتطلب موافقة مسبقة» في تصاعد",
          reasons: {
            missingDocumentation: "نقص المستندات",
            invalidSbsCode: "رمز SBS غير صحيح",
            priorAuthRequired: "تتطلب موافقة مسبقة",
            coverageExpired: "انتهاء التغطية",
            duplicateClaim: "مطالبة مكررة"
          }
        },
        payers: {
          title: "أداء شركات التأمين",
          subtitle: "معدل الموافقة ومتوسط زمن القرار حسب شركة التأمين.",
          days: "يوم"
        },
        risk: {
          title: "مؤشر المخاطر",
          subtitle: "مخاطر الرفض ونافذة التقلب للدورة القادمة.",
          composite: "مخاطر مركبة",
          minimal: "منخفض جداً",
          low: "منخفض",
          window: "متوسط",
          critical: "حرج"
        },
        loading: {
          title: "جارٍ تحميل التوقعات",
          subtitle: "يتم تجميع المؤشرات التنبؤية..."
        }
      },
      settings: {
        header: {
          title: "إعدادات النظام",
          subtitle: "اضبط بيئة GIVC-SBS ومعايير الأمان ومنطق الترحيل الذاتي.",
          badge: "بوابة الأمان"
        },
        operationalLogic: {
          title: "المنطق التشغيلي",
          subtitle: "إدارة كيفية اتخاذ القرارات الذاتية داخل بوابة الترحيل.",
          autonomousMapping: {
            label: "الربط الذاتي",
            desc: "مزامنة المطالبات تلقائياً عند تجاوز حد الثقة."
          },
          confidenceThreshold: {
            label: "حد الثقة",
            hint: "الحد الأدنى للفرز التلقائي"
          }
        },
        connectivity: {
          title: "اتصال البوابة",
          subtitle: "إدارة نقاط النهاية ومفاتيح الأمان الخاصة بالإنتاج.",
          n8nWebhook: {
            label: "Webhook ترحيل n8n",
            placeholder: "https://n8n.brainsait.cloud/..."
          },
          nphiesEnv: {
            label: "بيئة نفيس",
            options: {
              production: "عقدة الإنتاج",
              sandbox: "بيئة المطور",
              uat: "بيئة UAT"
            }
          },
          warning: "تغيير بيئة نفيس سيبطل رموز الجلسة الحالية ويتطلب إعادة مصافحة أمنية كاملة."
        },
        preferences: {
          title: "تفضيلات الواجهة",
          luminanceProfile: {
            label: "نمط الإضاءة",
            desc: "التبديل بين الوضع الداكن عالي التباين والوضع الفاتح السريري."
          },
          dispatchNotifications: {
            label: "إشعارات التنبيه",
            desc: "استقبل تنبيهات فشل الترحيل لحظياً عبر قنوات بريد مشفرة."
          }
        },
        actions: {
          factoryReset: "إعادة ضبط المصنع",
          discard: "تجاهل",
          commit: "حفظ التغييرات"
        },
        toast: {
          factoryReset: "إعادة ضبط المصنع تتطلب تأكيد المسؤول",
          discarded: "تم تجاهل التغييرات",
          committed: "تم حفظ الإعدادات بنجاح"
        }
      },
      codeBrowser: {
        header: {
          title: "مستكشف المصطلحات",
          subtitleTemplate: "سجل عالمي يضم {count} مؤشر سريري من SBS.",
          badge: "مخطط المعرفة"
        },
        view: {
          grid: "عرض شبكي",
          condensed: "مختصر"
        },
        search: {
          label: "بحث في دليل SBS",
          placeholder: "ابحث بالمعرف أو المعنى أو الوصف السريري..."
        },
        category: {
          label: "التصنيف"
        },
        loading: {
          catalog: "جارٍ تحميل دليل SBS الرسمي..."
        },
        empty: "لم يتم العثور على مؤشرات سريرية",
        detail: {
          kicker: "تفاصيل السجل",
          close: "إغلاق لوحة التفاصيل",
          technical: "التسمية التقنية",
          domain: "تصنيف المجال",
          fallbackCategory: "سريري عام",
          neuralCrossRef: "مرجع تقاطعي ذكي",
          approvalConfidence: "ثقة الموافقة",
          deepSeekLead: "تشير استدلالات DeepSeek إلى ارتباط عالٍ مع",
          deepSeekCode: "ICD-10 M17.0",
          deepSeekTail: "ضمن مسارات التشخيص."
        },
        actions: {
          enroll: "إضافة إلى مساحة العمل",
          copyId: "نسخ المعرّف"
        },
        cell: {
          copyAriaTemplate: "نسخ {code}",
          fallbackCategory: "سريري"
        },
        toast: {
          catalogUnavailable: "دليل SBS غير متاح مؤقتاً",
          codeCopied: "تم نسخ الرمز {code}",
          clipboardDenied: "تم رفض الوصول إلى الحافظة من المتصفح",
          staged: "تم تجهيز الرمز لمنشئ المطالبة"
        }
      },
      unifiedBrowser: {
        header: {
          title: "السجل الموحد",
          subtitleTemplate: "بحث ذاتي عبر {count} نظاماً صحياً عالمياً.",
          badge: "عقدة الشبكة",
          tags: {
            fhir: "FHIR R4 أصلي",
            ai: "محسن بالذكاء"
          }
        },
        search: {
          label: "بحث في الأنظمة الطبية",
          placeholder: "ابحث عبر الأنظمة (مثال: \"cardiology\", \"glucose\", \"I10\")..."
        },
        systems: {
          codes: "رموز"
        },
        empty: "لا توجد نتائج للبحث",
        result: {
          ariaLabelTemplate: "فتح {system} {code}"
        },
        detail: {
          close: "إغلاق لوحة التفاصيل",
          semantics: "الدلالات",
          statusLabel: "الحالة",
          statusActive: "نشط",
          authReqLabel: "متطلب الموافقة",
          authReqManual: "يدوي",
          bridgingTitle: "جسر الأنظمة",
          bridgingSubtitle: "ربط ذكي عبر الأنظمة.",
          match: "مطابقة"
        },
        actions: {
          addContext: "إضافة إلى سياق المطالبة",
          deepLink: "رابط السجل"
        },
        toast: {
          codeCopied: "تمت مزامنة رمز {system}",
          clipboardDenied: "تم رفض الوصول إلى الحافظة من المتصفح",
          contextAdded: "تمت إضافة السياق وفتح منشئ المطالبة",
          openedReference: "تم فتح مرجع السجل في علامة تبويب جديدة"
        }
      },
      mappings: {
        header: {
          title: "تحليلات ربط المطالبات",
          subtitle: "تحليل عميق لقياس المعايرة المباشر والتجاوزات ومتجهات عدم التطابق.",
          badgeLoading: "تهيئة القياس",
          badgeLive: "قياس مباشر"
        },
        stats: {
          mappingsObserved: "الربط المرصود",
          autoAcceptRate: "معدل القبول التلقائي",
          avgConfidenceSuffix: "متوسط الثقة",
          reviewQueue: "قائمة المراجعة",
          uniqueSuffix: "رموز فريدة",
          p95Latency: "زمن P95",
          avgLatencySuffix: "متوسط"
        },
        actions: {
          configureRules: "تهيئة القواعد",
          openReviewQueue: "فتح قائمة المراجعة",
          refresh: "تحديث"
        },
        lastEvent: "آخر حدث:",
        charts: {
          transformationAccuracy: {
            title: "دقة التحويل",
            subtitle: "الحجم اليومي ومتوسط الثقة من بث المعايرة المباشر."
          },
          legend: {
            volume: "الحجم",
            avgConfidence: "متوسط الثقة"
          },
          daily: {
            loading: "جارٍ تحميل القياس",
            empty: "لا توجد سلسلة يومية بعد"
          }
        },
        facilities: {
          title: "لوحة المنشآت",
          subtitle: "أعلى المنشآت حسب حجم الربط (نافذة القياس المباشرة).",
          table: {
            facility: "المنشأة",
            volume: "الحجم",
            avgConfidence: "متوسط الثقة",
            overrides: "التجاوزات"
          },
          row: {
            facilityLabel: "منشأة #{id}",
            nodeLabel: "عقدة {id}"
          },
          empty: {
            loading: "جارٍ تحميل القياس...",
            noData: "لا توجد أحداث ربط بعد. نفّذ عملية معايرة لتوليد القياس."
          }
        },
        anomalies: {
          title: "متجهات الشذوذ",
          subtitle: "إشارات عدم التطابق والتجاوز داخل نافذة القياس.",
          totalFlags: "إجمالي الإشارات",
          items: {
            noMatch: "بدون تطابق / تمرير",
            rejectedLowConf: "مرفوض (ثقة منخفضة)",
            overrideHits: "مرات التجاوز"
          }
        },
        aiAudit: {
          title: "جاهز للتدقيق الذكي",
          bodyLead: "الحوكمة نشطة. التجاوزات المضبوطة:",
          button: "مراجعة الحوكمة"
        }
      },
      mappingRules: {
        header: {
          title: "قواعد الحوكمة",
          subtitle: "تهيئة حدود الثقة وتجاوزات المنشآت لحوكمة المعايرة.",
          badgeLoading: "جارٍ التحميل",
          badgeLive: "محرك الحوكمة"
        },
        actions: {
          versionHistory: "سجل الإصدارات",
          reset: "إعادة ضبط",
          save: "حفظ الملف"
        },
        thresholds: {
          title: "حدود المنطق العامة",
          subtitle: "حدود الثقة التي تحدد سلوك الترحيل الذاتي.",
          autoAccept: {
            label: "حد القبول التلقائي",
            hint: "الحمولات التي تتجاوز هذا الحد تتخطى المراجعة اليدوية."
          },
          reviewTrigger: {
            label: "حد المراجعة",
            hint: "الحد الأدنى المطلوب لمرشحي الذكاء الاصطناعي."
          },
          infoTemplate:
            "المطالبات بين {review}% و {auto}% تُرسل لمراجعة الخبراء. الحمولات الأقل من {review}% يمكن اعتبارها مرفوضة حسب الحوكمة."
        },
        heuristics: {
          title: "خيارات تشغيلية",
          subtitle: "مفاتيح تشغيلية يتم تسجيلها ضمن إعدادات الحوكمة.",
          toggles: {
            fuzzy: {
              label: "معايرة تقريبية",
              desc: "تفعيل المطابقة الدلالية للاختصارات السريرية غير المنظمة."
            },
            universal: {
              label: "أولوية SBS",
              desc: "تفضيل أنظمة الأكواد السعودية V3.1 عند التعارض."
            },
            icd10: {
              label: "إلزام ICD-10",
              desc: "رفض المطالبات التي تفتقد تحققاً تشخيصياً ثانوياً."
            }
          }
        },
        overrides: {
          title: "تجاوزات المنشآت",
          subtitle: "تجاوزات حسب المنشأة (تُطبق في الخادم أثناء /api/normalize).",
          add: "إضافة تجاوز",
          editor: {
            facilityId: "معرف المنشأة",
            confidence: "الثقة (0-1)",
            internalCode: "الرمز الداخلي",
            mappedSbsCode: "رمز SBS المطابق",
            description: "الوصف",
            notes: "ملاحظات",
            cancel: "إلغاء",
            save: "حفظ التجاوز"
          },
          table: {
            facility: "المنشأة",
            internal: "داخلي",
            sbs: "SBS",
            conf: "ثقة",
            loading: "جارٍ تحميل التجاوزات...",
            empty: "لا توجد تجاوزات."
          },
          row: {
            delete: "حذف التجاوز"
          }
        },
        simulator: {
          title: "المحاكي الذكي",
          subtitle: "تحقق من القواعد عبر /api/normalize باستخدام ملف الحوكمة الحالي.",
          resolutionError: "خطأ في المعايرة",
          decisions: {
            autoAccepted: "مقبول تلقائياً",
            reviewRequired: "يتطلب مراجعة",
            rejected: "مرفوض"
          },
          fields: {
            facilityId: "معرف المنشأة",
            internalCode: "الرمز الداخلي",
            description: "الوصف",
            descriptionPlaceholder: "صف خدمة سريرية..."
          },
          actions: {
            simulate: "محاكاة"
          },
          output: {
            predicted: "المعايرة المتوقعة",
            sourceLabel: "المصدر",
            confidenceLabel: "الثقة",
            resultLabel: "النتيجة"
          }
        },
        toast: {
          loadConfigFailed: "فشل تحميل إعدادات الحوكمة",
          loadOverridesFailed: "فشل تحميل التجاوزات",
          profileSaved: "تم حفظ ملف الحوكمة",
          saveConfigFailed: "فشل حفظ الإعدادات",
          defaultStaged: "تمت تهيئة الملف الافتراضي (احفظ للتطبيق)",
          overrideRequired: "الرمز الداخلي ورمز SBS مطلوبان",
          overrideSaved: "تم حفظ التجاوز",
          overrideSaveFailed: "فشل حفظ التجاوز",
          overrideDeleted: "تم حذف التجاوز",
          deleteFailed: "فشل الحذف",
          internalCodeRequired: "الرمز الداخلي مطلوب",
          versionHistoryUnavailable: "سجل الإصدارات غير متاح في هذا النشر"
        }
      }
    }
  }
};
