import BrandLogo from '@/components/BrandLogo';
import AppHeader from '@/components/AppHeader';
import IconAgents from '@/assets/icons/nav-agents.svg?react';
import IconGlobe from '@/assets/icons/globe.svg?react';
import IconPlatform from '@/assets/icons/nav-platform.svg?react';
import IconAccounts from '@/assets/icons/sys-accounts.svg?react';
import IconModels from '@/assets/icons/sys-models.svg?react';
import IconSettings from '@/assets/icons/action-toggle.svg?react';
import IconChat from '@/assets/icons/action-chat.svg?react';
import IconViewMasonry from '@/assets/icons/view-masonry.svg?react';
import { EnterpriseRoute } from '@/enums/routes';
import { cn } from '@/lib/utils';

type AppTopHeaderProps = {
  selected?: string;
  isAdmin: boolean;
  activeApp: 'chat' | 'management';
  onNavigate: (route: EnterpriseRoute) => void;
  onOpenChat: () => void;
  onOpenManagement: () => void;
  onLogout: () => void;
  userName?: string;
};

const NAV_ITEMS = [
  { route: EnterpriseRoute.Platform, label: '数字广场', Icon: IconPlatform },
  { route: EnterpriseRoute.Agents, label: '我的数字员工', Icon: IconAgents },
  { route: EnterpriseRoute.Channels, label: '渠道接入', Icon: IconGlobe },
] as const;

const ADMIN_NAV_ITEMS = [
  { route: EnterpriseRoute.Accounts, label: '账号管理', Icon: IconAccounts },
  { route: EnterpriseRoute.Models, label: '模型配置', Icon: IconModels },
  { route: EnterpriseRoute.RuntimeSettings, label: '运行设置', Icon: IconSettings },
] as const;

export default function AppTopHeader({
  selected,
  isAdmin,
  activeApp,
  onNavigate,
  onOpenChat,
  onOpenManagement,
  onLogout,
  userName,
}: AppTopHeaderProps) {
  const navItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <AppHeader
      className="app-top-header h-[60px] shrink-0 items-center border-b border-[#e5e6eb] bg-white px-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
      left={(
        <div className="flex items-center">
          <BrandLogo />
        </div>
      )}
      navigation={(
        <nav aria-label="主导航" className="flex min-w-0 items-center gap-[4px] overflow-x-auto">
          {navItems.map(({ route, label, Icon }) => (
            <button
              key={route}
              type="button"
              onClick={() => onNavigate(route)}
              aria-current={selected === route ? 'page' : undefined}
              className={cn(
                'flex h-[36px] shrink-0 items-center gap-[8px] rounded-[6px] px-[12px] text-[14px] font-medium text-[#1f2329] transition-colors hover:bg-[#eff4ff] hover:text-[#1f5fef]',
                selected === route && 'bg-[#eff4ff] font-semibold text-[#1f5fef]',
              )}
            >
              <Icon className="size-[16px]" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      beforeLanguage={(
        <div className="flex h-[32px] items-center rounded-[6px] border border-[#e3e7f1] bg-[#f7f8fa] p-[2px]">
          <button
            type="button"
            onClick={onOpenChat}
            aria-pressed={activeApp === 'chat'}
            className={cn(
              'flex h-[26px] items-center gap-[4px] rounded-[4px] px-[8px] text-[12px] font-medium text-[#646a73] transition-colors',
              activeApp === 'chat' && 'bg-white text-[#1f5fef] shadow-[0_1px_2px_rgba(16,24,40,0.08)]',
            )}
          >
            <IconChat className="size-[14px]" />
            对话端
          </button>
          <button
            type="button"
            onClick={onOpenManagement}
            aria-pressed={activeApp === 'management'}
            className={cn(
              'flex h-[26px] items-center gap-[4px] rounded-[4px] px-[8px] text-[12px] font-medium text-[#646a73] transition-colors',
              activeApp === 'management' && 'bg-white text-[#1f5fef] shadow-[0_1px_2px_rgba(16,24,40,0.08)]',
            )}
          >
            <IconViewMasonry className="size-[14px]" />
            管理端
          </button>
        </div>
      )}
      showControls
      onLogout={onLogout}
      userName={userName}
    />
  );
}
