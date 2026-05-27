import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'ClaimFlow <noreply@claimflow.app>'

interface EmailData {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: EmailData) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key') {
    console.log('[Email skipped - no API key]', { to, subject })
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Email error]', err)
  }
}

function baseTemplate(content: string, previewText: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${previewText}</title>
  <style>
    body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 20px; font-weight: 700; color: #f59e0b; margin-bottom: 24px; letter-spacing: -0.5px; }
    h2 { color: #f1f5f9; font-size: 20px; margin: 0 0 16px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #f59e0b; color: #0f172a; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .meta { background: #0f172a; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .meta-label { color: #64748b; font-size: 12px; }
    .meta-value { color: #e2e8f0; font-size: 12px; font-family: monospace; }
    .footer { text-align: center; padding-top: 24px; color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">⚡ ClaimFlow</div>
      ${content}
    </div>
    <div class="footer">ClaimFlow · Property Claims Management</div>
  </div>
</body>
</html>`
}

export async function sendEstimateSubmittedEmail({
  adjusterEmail,
  adjusterName,
  contractorName,
  claimTitle,
  claimId,
  totalAmount,
  appUrl,
}: {
  adjusterEmail: string
  adjusterName: string
  contractorName: string
  claimTitle: string
  claimId: string
  totalAmount: number
  appUrl: string
}) {
  const content = `
    <h2>Estimate Submitted for Review</h2>
    <p>Hi ${adjusterName}, ${contractorName} has submitted an estimate for your review.</p>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">Claim</span><span class="meta-value">${claimTitle}</span></div>
      <div class="meta-row"><span class="meta-label">Amount</span><span class="meta-value">$${totalAmount.toFixed(2)}</span></div>
      <div class="meta-row"><span class="meta-label">Submitted by</span><span class="meta-value">${contractorName}</span></div>
    </div>
    <a href="${appUrl}/claim/${claimId}" class="btn">Review Estimate →</a>
  `
  await sendEmail({
    to: adjusterEmail,
    subject: `Estimate submitted: ${claimTitle}`,
    html: baseTemplate(content, `Estimate submitted for ${claimTitle}`),
  })
}

export async function sendDecisionEmail({
  contractorEmail,
  contractorName,
  adjusterName,
  claimTitle,
  claimId,
  decision,
  notes,
  appUrl,
}: {
  contractorEmail: string
  contractorName: string
  adjusterName: string
  claimTitle: string
  claimId: string
  decision: string
  notes: string
  appUrl: string
}) {
  const decisionLabel = decision === 'approved' ? '✅ Approved' : decision === 'denied' ? '❌ Denied' : '🔄 Changes Requested'
  const content = `
    <h2>Decision Recorded: ${decisionLabel}</h2>
    <p>Hi ${contractorName}, ${adjusterName} has reviewed your estimate for <strong style="color:#e2e8f0">${claimTitle}</strong>.</p>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">Decision</span><span class="meta-value">${decisionLabel}</span></div>
      <div class="meta-row"><span class="meta-label">Notes</span><span class="meta-value">${notes}</span></div>
    </div>
    <a href="${appUrl}/claim/${claimId}" class="btn">View Claim →</a>
  `
  await sendEmail({
    to: contractorEmail,
    subject: `Estimate ${decision}: ${claimTitle}`,
    html: baseTemplate(content, `Estimate ${decision} for ${claimTitle}`),
  })
}

export async function sendSupplementRequestedEmail({
  adjusterEmail,
  adjusterName,
  contractorName,
  claimTitle,
  claimId,
  lineItem,
  amount,
  appUrl,
}: {
  adjusterEmail: string
  adjusterName: string
  contractorName: string
  claimTitle: string
  claimId: string
  lineItem: string
  amount: number
  appUrl: string
}) {
  const content = `
    <h2>Supplement Request</h2>
    <p>Hi ${adjusterName}, ${contractorName} has requested a supplement on <strong style="color:#e2e8f0">${claimTitle}</strong>.</p>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">Line Item</span><span class="meta-value">${lineItem}</span></div>
      <div class="meta-row"><span class="meta-label">Amount</span><span class="meta-value">$${amount.toFixed(2)}</span></div>
    </div>
    <a href="${appUrl}/claim/${claimId}?tab=supplements" class="btn">Review Supplement →</a>
  `
  await sendEmail({
    to: adjusterEmail,
    subject: `Supplement request: ${claimTitle}`,
    html: baseTemplate(content, `Supplement request for ${claimTitle}`),
  })
}

export async function sendIdleClaimEmail({
  contractorEmail,
  contractorName,
  claimTitle,
  claimId,
  daysSinceActivity,
  appUrl,
}: {
  contractorEmail: string
  contractorName: string
  claimTitle: string
  claimId: string
  daysSinceActivity: number
  appUrl: string
}) {
  const content = `
    <h2>Claim Needs Attention</h2>
    <p>Hi ${contractorName}, your claim <strong style="color:#e2e8f0">${claimTitle}</strong> hasn't had any activity in ${daysSinceActivity} days.</p>
    <p>Log in to check the status and take any needed actions to keep things moving.</p>
    <a href="${appUrl}/claim/${claimId}" class="btn">View Claim →</a>
  `
  await sendEmail({
    to: contractorEmail,
    subject: `Claim needs attention: ${claimTitle}`,
    html: baseTemplate(content, `${claimTitle} needs attention`),
  })
}
