import { useNavigate } from 'react-router-dom';

import AppHeader from '@/components/AppHeader';
import IconAccounts from '@/assets/icons/sys-accounts.svg?react';
import IconModels from '@/assets/icons/sys-models.svg?react';
import { EnterpriseRoute } from '@/enums/routes';
import { cn } from '@/lib/utils';
import type { EnterpriseAuthUser } from '@/auth';

import AccountsPage from './AccountsPage';
import ModelsPage from './ModelsPage';

export type SystemManagementTab = 'models' | 'accounts';

const TABS: Array<{ id: SystemManagementTab; label: string; route: EnterpriseRoute; Icon: typeof IconModels }> = [
  { id: 'models', label: '模型配置', route: EnterpriseRoute.Models, Icon: IconModels },
  { id: 'accounts', label: '账号管理', route: EnterpriseRoute.Accounts, Icon: IconAccounts },
];

/** A shared admin entry point for model configuration and account administration. */
export default function SystemManagementPage({
  tab,
  currentUser,
  onLogout,
}: {
  tab: SystemManagementTab;
  currentUser?: EnterpriseAuthUser;
  onLogout?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-full box-border px-[48px] pt-[32px] pb-[43px] max-[900px]:px-[16px]">
      <AppHeader className="items-center" onLogout={onLogout} userName={currentUser?.username} title="系统管理" />

      <div className="mt-[20px] flex w-full gap-[8px] border-b border-[var(--color-border)]" role="tablist" aria-label="系统管理分类">
        {TABS.map(({ id, label, route, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => navigate(route)}
              className={cn(
                'relative flex h-[40px] items-center gap-[8px] px-[12px] text-[14px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary-text)]',
                active && 'font-semibold text-[var(--color-primary-text)] after:absolute after:bottom-0 after:left-[12px] after:right-[12px] after:h-[2px] after:rounded-full after:bg-[var(--color-primary)]',
              )}
            >
              <Icon className="size-[16px]" />
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-h-0">
        {tab === 'models' ? (
          <ModelsPage currentUser={currentUser} onLogout={onLogout} embedded />
        ) : (
          <AccountsPage currentUser={currentUser} onLogout={onLogout} embedded />
        )}
      </div>
    </div>
  );
}
