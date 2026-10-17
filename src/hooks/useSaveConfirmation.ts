import {useApp} from '../context/AppContext';
import {useBusinessStatus,waitForBusinessSave} from '../lib/businessPersistence';
import {useAccountSession,waitForAccountSave} from '../lib/accountSession';

/** Keep forms/drafts open until the shared persistence layer confirms the write. */
export function useSaveConfirmation(scope:'business'|'accounts'='business') {
 const business=useBusinessStatus(),accounts=useAccountSession();
 const {showToast}=useApp();
 const isSavingChanges=business.saving || accounts.saving;
 const confirmSave=async(onSuccess:()=>void):Promise<boolean>=>{
  try {
   await (scope==='accounts'?waitForAccountSave():waitForBusinessSave());
   onSuccess();return true;
  }catch(error){
   showToast(error instanceof Error?error.message:'Chưa lưu được dữ liệu. Vui lòng thử lại.','error');
   return false;
  }
 };
 return {confirmSave,isSavingChanges};
}
