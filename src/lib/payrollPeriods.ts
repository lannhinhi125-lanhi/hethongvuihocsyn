export interface PayrollMonthOption {
  value: string;
  label: string;
}

export const getPayrollMonthOptions = (today = new Date()): PayrollMonthOption[] =>
  [1, 0].map(monthOffset => {
    const date = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return {
      value: `${year}-${month}`,
      label: `Tháng ${month}/${year}`
    };
  });

export const getCurrentPayrollMonth = (today = new Date()) =>
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
