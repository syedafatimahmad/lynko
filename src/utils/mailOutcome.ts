/** Android cannot distinguish sending from cancelling the external email app. */
export function mailOutcome(platform: string, status: string): 'sent' | 'handoff' | 'cancelled' | 'saved' {
  if (platform === 'android') return 'handoff';
  if (status === 'sent') return 'sent';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'saved') return 'saved';
  return 'handoff';
}
