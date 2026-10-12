'use server';

// Adapter frontend → lib/actions/* (Dimas). Satu titik integrasi: kalau nama/
// bentuk action berubah, cukup ubah file ini. Semua return pola Result<T>.

import * as auth from '@/lib/actions/auth';
import * as employees from '@/lib/actions/employees';
import * as contracts from '@/lib/actions/contracts';
import * as leaves from '@/lib/actions/leaves';
import * as dashboard from '@/lib/actions/dashboard';
import * as documents from '@/lib/actions/documents';
import * as admin from '@/lib/actions/admin';
import * as meta from '@/lib/actions/meta';
import type {
  ActionResult,
  DashboardStats,
  EmailTemplateRow,
  EmployeeDetail,
  EmployeeListItem,
  ContractRow,
  LeaveRow,
  Meta,
  Page,
  ReminderLogRow,
  SaldoCuti,
  UserRow,
} from './types';

async function call<T>(p: Promise<unknown>): Promise<ActionResult<T>> {
  return (await p) as ActionResult<T>;
}

type Input = Record<string, unknown>;

// --- auth ---
export async function login(input: Input): Promise<ActionResult<{ userId: string }>> {
  return call(auth.login(input));
}

export async function logout(): Promise<ActionResult<null>> {
  return call(auth.logout());
}

// --- karyawan ---
export async function getEmployees(input: Input): Promise<ActionResult<Page<EmployeeListItem>>> {
  return call(employees.listEmployees(input));
}

export async function getEmployeeDetail(input: Input): Promise<ActionResult<EmployeeDetail>> {
  return call(employees.getEmployee(input));
}

export async function saveEmployee(input: Input): Promise<ActionResult<EmployeeDetail>> {
  return call(employees.createEmployee(input));
}

export async function changeEmployee(input: Input): Promise<ActionResult<EmployeeDetail>> {
  return call(employees.updateEmployee(input));
}

export async function removeEmployee(input: Input): Promise<ActionResult<{ deleted: boolean }>> {
  return call(employees.deleteEmployee(input));
}

export async function getDepartments(): Promise<ActionResult<string[]>> {
  return call(employees.listDepartments());
}

// --- kontrak ---
export async function getContracts(input: Input): Promise<ActionResult<Page<ContractRow>>> {
  return call(contracts.listContracts(input));
}

export async function getReminderLogs(input: Input): Promise<ActionResult<Page<ReminderLogRow>>> {
  return call(contracts.listReminderLogs(input));
}

export async function addContract(input: Input): Promise<ActionResult<ContractRow>> {
  return call(contracts.createContract(input));
}

export async function editContract(input: Input): Promise<ActionResult<ContractRow>> {
  return call(contracts.updateContract(input));
}

// --- cuti ---
export async function getLeaves(input: Input): Promise<ActionResult<Page<LeaveRow>>> {
  return call(leaves.listLeaves(input));
}

export async function sendLeave(input: Input): Promise<ActionResult<LeaveRow>> {
  return call(leaves.submitLeave(input));
}

export async function approveLeave(input: Input): Promise<ActionResult<LeaveRow>> {
  return call(leaves.approveLeave(input));
}

export async function rejectLeave(input: Input): Promise<ActionResult<LeaveRow>> {
  return call(leaves.rejectLeave(input));
}

export async function cancelLeave(input: Input): Promise<ActionResult<{ id: string }>> {
  return call(leaves.cancelLeave(input));
}

export async function saveLeaveBalance(input: Input): Promise<ActionResult<SaldoCuti>> {
  return call(leaves.setLeaveBalance(input));
}

// --- dashboard / meta ---
export async function getDashboard(): Promise<ActionResult<DashboardStats>> {
  return call(dashboard.getDashboardStats());
}

export async function getMeta(): Promise<ActionResult<Meta>> {
  return call(meta.getMeta());
}

// --- dokumen ---
export async function makeDocument(
  input: Input
): Promise<ActionResult<{ base64: string; filename: string }>> {
  return call(documents.generateDocument(input));
}

// --- pengaturan ---
export async function getUsers(input: Input): Promise<ActionResult<Page<UserRow>>> {
  return call(admin.listUsers(input));
}

export async function addUser(input: Input): Promise<ActionResult<UserRow>> {
  return call(admin.createUser(input));
}

export async function changeUserRole(input: Input): Promise<ActionResult<UserRow>> {
  return call(admin.updateUserRole(input));
}

export async function setUserActive(input: Input): Promise<ActionResult<UserRow>> {
  return call(admin.setUserActive(input));
}

export async function sendPasswordReset(input: Input): Promise<ActionResult<{ requested: boolean }>> {
  return call(admin.resetUserPassword(input));
}

export async function getEmailTemplates(): Promise<ActionResult<EmailTemplateRow[]>> {
  return call(admin.listEmailTemplates());
}

export async function saveEmailTemplate(input: Input): Promise<ActionResult<EmailTemplateRow>> {
  return call(admin.saveEmailTemplate(input));
}

export async function resetEmailTemplate(input: Input): Promise<ActionResult<{ reset: boolean }>> {
  return call(admin.resetEmailTemplate(input));
}

export async function saveDocumentTemplate(input: Input): Promise<ActionResult<unknown>> {
  return call(admin.saveDocumentTemplate(input));
}
