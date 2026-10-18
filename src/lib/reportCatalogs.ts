import { catalogTree } from './catalogTree';
import { studentRegistrationRows } from './studentRegistrations';
import type { ClassItem, StudentRecord, TeacherProfile } from '../types';
import type { ReportLookups } from './operationalReportDatasets';
import type { ReportDataset, ReportDimension, ReportRecord } from './customReports';

export function reportGradeKey(grade: string, category: string | undefined, lookups: ReportLookups): string {
  const matches = lookups.teachingCategories?.filter(row => row.options.some(option => option.id === grade)) || [];
  return matches.length > 1 && category ? JSON.stringify([category, grade]) : grade;
}

/** Catalog IDs remain the keys; names are only presentation labels. */
export function attachReportCatalogs(datasets: ReportDataset[], { classes, students, teachers, lookups }: {
  classes: ClassItem[]; students: StudentRecord[]; teachers: TeacherProfile[]; lookups: ReportLookups;
}) {
  const categories = lookups.teachingCategories || [];
  const gradeChoices = categories.flatMap(category => catalogTree(category.options).map(option => ({ value: reportGradeKey(option.id, category.id, lookups), label: option.label, group: category.name, depth: option.depth - 1 })));
  const categoryForGrade = (grade?: string) => {
    const matches = categories.filter(category => category.options.some(option => option.id === grade));
    return matches.length === 1 ? matches[0].id : undefined;
  };
  const catalogFields: ReportDimension[] = [
    { id: 'category', label: 'Cấp học', choices: lookups.teachingCategories?.map(row => ({ value: row.id, label: row.name })) },
    { id: 'grade', label: 'Lớp dạy', recordField: '__grade', choices: lookups.teachingCategories ? gradeChoices : undefined },
    { id: 'subject', label: 'Môn học', recordField: '__subject', choices: lookups.subjects?.map(row => ({ value: row.code, label: row.name })) },
    { id: 'model', label: 'Mô hình', recordField: '__model', choices: lookups.models?.map(row => ({ value: row.code, label: row.name })) },
    { id: 'program', label: 'Chương trình / Trình độ', choices: lookups.levels?.map(row => ({ value: row.code, label: row.name })) },
    { id: 'timeSlot', label: 'Khung giờ', recordField: '__timeSlot', choices: lookups.timeSlots?.map(row => ({ value: row.id, label: row.timeRange })) }
  ];
  const studentMap = new Map(students.map(row => [row.id, row]));
  const registrationMap = new Map(studentRegistrationRows(students).map(row => [row.registrationKey, row]));
  const teacherMap = new Map(teachers.map(row => [row.id, row]));
  const classMap = new Map(classes.map(row => [row.code, row]));
  for (const dataset of datasets) {
    const transform = (record: ReportRecord): ReportRecord => {
      const source = dataset.id === 'classes' ? classMap.get(String(record.id))
        : dataset.id === 'student_registrations' ? registrationMap.get(String(record.registrationKey))
        : dataset.id === 'students' ? studentMap.get(String(record.id))
        : ['teachers', 'inspection_teachers'].includes(dataset.id) ? teacherMap.get(String(record.id)) : undefined;
      const grade = source && 'grade' in source ? source.grade : record.__grade ?? record.grade;
      const category = source && 'categoryId' in source ? source.categoryId
        : source && 'levelId' in source ? source.levelId : undefined;
      const categoryId = category || record.category || categoryForGrade(String(grade || ''));
      const gradeKey = reportGradeKey(String(grade || ''), categoryId ? String(categoryId) : undefined, lookups);
      return { ...record, __grade: gradeKey, category: categoryId,
        __subject: source?.subject || record.__subject || record.subject,
        __model: source && 'model' in source ? source.model : record.__model || record.model,
        __timeSlot: record.__timeSlot || record.timeSlot,
        program: source && 'level' in source ? source.level : record.program,
        grade: source && 'grades' in source ? source.grades.map(item => gradeChoices.find(choice => choice.value === reportGradeKey(item, source.levelId, lookups))?.label || item).join(', ') : gradeChoices.find(choice => choice.value === gradeKey)?.label || record.grade };
    };
    dataset.records = dataset.records.map(transform);
    // Range projections (class growth and teacher averages) must use the same catalog joins.
    const prepare = dataset.prepareRange;
    if (prepare) dataset.prepareRange = range => {
      const prepared = prepare(range);
      return { ...prepared, records: prepared.records.map(transform) };
    };
    for (const field of catalogFields) {
      if (field.choices) field.choices = field.choices.map(choice => ({ ...choice, label: field.choices!.filter(item => item.label === choice.label).length > 1 ? choice.label + ' (' + (choice.group || choice.value) + ')' : choice.label }));
      if (!field.choices) continue;
      const detailField = dataset.detailFields.find(item => item.id === field.id);
      if (detailField) detailField.label = field.label;
      const exists = dataset.filters.some(item => item.id === field.id);
      const supported = exists || field.id === 'category' || (field.id === 'program' && dataset.id !== 'teachers' && dataset.id !== 'inspection_teachers');
      if (!supported) continue;
      for (const collection of [dataset.filters, dataset.dimensions]) {
        const existing = collection.find(item => item.id === field.id);
        if (existing) Object.assign(existing, field);
        else collection.push({ ...field });
      }
    }
  }
}
