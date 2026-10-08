// What to tell the bar about a distributor whose order emails aren't
// arriving (86d-api flags it from Resend's bounce / spam-complaint webhook).
// One plain sentence plus what to do; null when nothing is wrong.

export interface EmailProblemSource {
  email?: string | null;
  emailProblem?: 'bounced' | 'complained' | null;
  emailProblemReason?: string | null;
  emailProblemAt?: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function emailProblemText(d: EmailProblemSource): { title: string; detail: string } | null {
  if (!d.emailProblem) return null;
  const when = d.emailProblemAt ? new Date(d.emailProblemAt) : null;
  const on = when && !isNaN(when.getTime()) ? ` on ${MONTHS[when.getMonth()]} ${when.getDate()}` : '';
  const who = d.email || 'this address';
  if (d.emailProblem === 'complained') {
    return {
      title: `Your order was marked as spam${on}`,
      detail: `Someone at ${who} reported the order email as spam, so future orders may not reach them. Call your rep to confirm the right address.`,
    };
  }
  return {
    title: `Order emails to ${who} are bouncing`,
    detail: `Their mail server rejected the order${on}${d.emailProblemReason ? ` (${d.emailProblemReason})` : ''}. Check the address with your rep and fix it in Settings — or call this order in.`,
  };
}
