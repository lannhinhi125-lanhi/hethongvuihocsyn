import React from 'react';
import { ReportWorkspace } from './ReportWorkspace';
import { Workbench } from './Workbench';

/** Retains the module entry point while reports share the new workspace. */
export const Module8_Reports: React.FC<{ mode?: 'dashboard' | 'reports' }> = ({ mode = 'reports' }) =>
  mode === 'dashboard' ? <Workbench /> : <ReportWorkspace />;
