export const canPreviewStep3FromSelection = (
  tourPackage: string,
  tourDate: string,
): boolean => {
  return Boolean(tourPackage && tourDate);
};

export const canSelectStep3PlansFromPaymentState = (
  paymentConfirmed: boolean,
): boolean => {
  return paymentConfirmed;
};
