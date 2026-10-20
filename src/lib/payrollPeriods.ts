export interface PayrollMonthOption {
  value: string;
  label: string;
}

export const getPayrollMonthOptions = (today = new Date(), knownMonths: string[] = []): PayrollMonthOption[] => {
  const recent = [1, 0].map(monthOffset => {
    const date = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return {
      value: `${year}-${month}`,
      label: `Tháng ${month}/${year}`
    };
  });
  return [...new Set([...recent.map(row => row.value), ...knownMonths.filter(month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))])].sort().reverse().map(value => ({value,label:`Tháng ${value.slice(5)}/${value.slice(0,4)}`}));
};

export const getCurrentPayrollMonth = (today = new Date()) =>
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
