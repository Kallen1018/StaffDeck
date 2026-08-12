// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/i18n';
import { EnterpriseRoute } from '@/enums/routes';

import AppTopHeader from './AppTopHeader';

describe('AppTopHeader', () => {
  afterEach(cleanup);

  it('provides runtime settings in the admin header navigation', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(createElement(I18nProvider, null, createElement(AppTopHeader, {
      selected: EnterpriseRoute.RuntimeSettings,
      isAdmin: true,
      activeApp: 'management',
      onNavigate,
      onOpenChat: vi.fn(),
      onOpenManagement: vi.fn(),
      onLogout: vi.fn(),
    })));

    const runtimeSettings = screen.getByRole('button', { name: '运行设置' });
    expect(runtimeSettings.getAttribute('aria-current')).toBe('page');

    await user.click(runtimeSettings);
    expect(onNavigate).toHaveBeenCalledWith(EnterpriseRoute.RuntimeSettings);
  });

  it('does not expose admin navigation to members', () => {
    render(createElement(I18nProvider, null, createElement(AppTopHeader, {
      isAdmin: false,
      activeApp: 'management',
      onNavigate: vi.fn(),
      onOpenChat: vi.fn(),
      onOpenManagement: vi.fn(),
      onLogout: vi.fn(),
    })));

    expect(screen.queryByRole('button', { name: '运行设置' })).toBeNull();
  });
});
