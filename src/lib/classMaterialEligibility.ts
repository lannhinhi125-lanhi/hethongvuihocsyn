import type {ClassItem} from '../types';
import {reportToday} from './customReports';

export function canAssignClassMaterials(cls:ClassItem,today=reportToday()):boolean {
  return (cls.status==='Đang học' || cls.status==='Chờ khai giảng') && !cls.paused && (!cls.endDate || cls.endDate>=today);
}
