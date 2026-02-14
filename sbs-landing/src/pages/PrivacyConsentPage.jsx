import React from 'react';
import { i18n } from '../utils/i18n';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

export function PrivacyConsentPage({ lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.privacy || i18n.en.pages.privacy;

  const sections = [
    { key: 'noticeTitle', bodyKey: 'noticeBody', icon: 'warning' },
    { key: 'dataMinTitle', bodyKey: 'dataMinBody', icon: 'filter_alt' },
    { key: 'encryptionTitle', bodyKey: 'encryptionBody', icon: 'lock' },
    { key: 'accessTitle', bodyKey: 'accessBody', icon: 'admin_panel_settings' },
    { key: 'auditingTitle', bodyKey: 'auditingBody', icon: 'fact_check' },
    { key: 'retentionTitle', bodyKey: 'retentionBody', icon: 'delete' },
    { key: 'contactTitle', bodyKey: 'contactBody', icon: 'support_agent' }
  ];

  return (
    <div className="flex-1">
      <main className="max-w-[1200px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        <section className="animate-premium-in">
          <SectionHeader title={t.title} subtitle={t.subtitle} badge={t.badge} />
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          {sections.map((s) => (
            <Card key={s.key}>
              <CardHeader
                title={t.sections[s.key]}
                subtitle={null}
                action={
                  <span className="material-symbols-outlined text-slate-400" aria-hidden="true">
                    {s.icon}
                  </span>
                }
              />
              <CardBody>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.sections[s.bodyKey]}
                </p>
              </CardBody>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

