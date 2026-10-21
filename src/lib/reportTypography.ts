export const REPORT_FONT_FAMILY = '"Times New Roman", Times, serif';

export const reportDocumentTypography = `
body{font-family:${REPORT_FONT_FAMILY};font-size:13pt;line-height:1.5;color:#111}
table{font-family:inherit;font-size:11pt;line-height:1.4}
svg,svg text,svg tspan{font-family:${REPORT_FONT_FAMILY}!important}
h1{font-size:16pt}h2{font-size:14pt}h3{font-size:13pt}h4{font-size:12pt}
.address,.document-number,.document-classification,.document-info,.meta,.scope,.method,.notice,.attachments,.appendix-meta,.signer-role,.signer-hint,.blank-name,.signatures{font-size:11pt}
small,.footer,.repeated-title{font-size:10pt}
`;
