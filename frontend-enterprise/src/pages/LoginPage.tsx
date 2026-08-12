import { useState, type KeyboardEvent } from 'react';

import { api, TENANT_ID } from '../api/client';
import { setEnterpriseAuthSession, type EnterpriseAuthSession } from '../auth';
import IconFieldClear from '../assets/icons/field-clear.svg?react';
import IconFieldEye from '../assets/icons/field-eye.svg?react';
import IconFieldEyeOn from '../assets/icons/field-eye-on.svg?react';

export type LoginPageProps = {
  onLogin: (session: EnterpriseAuthSession) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    setUsernameError(trimmedUsername ? '' : '请输入账号');
    setPasswordError(trimmedPassword ? '' : '请输入密码');
    if (!trimmedUsername || !trimmedPassword) return;

    setLoading(true);
    try {
      const session = await api.post<EnterpriseAuthSession>('/api/auth/login', {
        tenant_id: TENANT_ID,
        username: trimmedUsername,
        password: trimmedPassword,
      });
      setEnterpriseAuthSession(session);
      onLogin(session);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '登录失败';
      setUsernameError('账号输入错误');
      setPasswordError(messageText || '密码输入错误');
    } finally {
      setLoading(false);
    }
  }

  function onFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') void login();
  }

  const inputBaseClass =
    'flex h-[44px] w-full items-center gap-[8px] rounded-[10px] border bg-white px-[16px] transition-colors';

  return (
    <main className="flex min-h-screen bg-white max-[760px]:flex-col">
      <section
        className="flex min-h-screen w-2/3 flex-col items-center justify-between bg-[#f7f8fa] px-[clamp(32px,8vw,128px)] py-[48px] text-center max-[760px]:min-h-0 max-[760px]:w-full max-[760px]:gap-[72px] max-[760px]:py-[32px]"
        style={{ background: 'linear-gradient(154deg, rgba(7, 7, 9, .082) 30%, #006be64d 48%, rgba(7, 7, 9, .082) 64%)' }}
      >
        <div className="text-[18px] font-semibold tracking-[0.2px] text-[#18181a]">MindStaff</div>
        <div className="max-w-[500px]">
          <p className="mb-[16px] text-[14px] font-medium uppercase tracking-[2px] text-[#2563eb]">Enterprise AI Workforce</p>
          <h1 className="text-[clamp(36px,4.5vw,64px)] font-semibold leading-[1.12] tracking-[-0.5px] text-[#18181a]">
            数字员工
            <br />
            运营平台
          </h1>
          <p className="mt-[24px] max-w-[420px] text-[16px] leading-[1.8] text-[#646a73]">
            统一配置、管理和运营企业数字员工，让每一次协作都更高效。
          </p>
        </div>
        <p className="text-[12px] text-[#8f959e]">MindStaff · 企业智能运营工作台</p>
      </section>

      <section className="flex min-h-screen w-1/3 items-center justify-center px-[32px] py-[48px] max-[760px]:min-h-0 max-[760px]:w-full max-[760px]:items-start max-[760px]:py-[16px]">
        <div className="w-full max-w-[380px]">
          <div className="mb-[32px]">
            <h2 className="text-[28px] font-semibold text-[#18181a]">登录</h2>
            <p className="mt-[8px] text-[14px] text-[#757f9c]">登录后进入 MindStaff 管理端</p>
          </div>
          <form
            className="flex w-full flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void login();
            }}
          >
            <div
              className={`${inputBaseClass} ${usernameError ? 'border-[#f54a45]' : username ? 'border-[#18181a]' : 'border-[#e3e7f1]'}`}
            >
              <input
                value={username}
                autoComplete="username"
                placeholder="请输入账号（首次使用请输入admin）"
                aria-label="账号"
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (usernameError) setUsernameError('');
                }}
                onKeyDown={onFieldKeyDown}
                className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#18181a] outline-none placeholder:text-[#757f9c]"
              />
              {username && (
                <button
                  type="button"
                  aria-label="清空账号"
                  onClick={() => {
                    setUsername('');
                    setUsernameError('');
                  }}
                  className="grid size-[18px] shrink-0 place-items-center text-[#667085] outline-none transition-colors hover:text-[#464c5e]"
                >
                  <IconFieldClear className="size-[18px]" />
                </button>
              )}
            </div>

            <div
              className={`mt-[24px] ${inputBaseClass} ${passwordError ? 'border-[#f54a45]' : password ? 'border-[#18181a]' : 'border-[#e3e7f1]'}`}
            >
              <input
                value={password}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="请输入密码（首次使用请输入admin）"
                aria-label="密码"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) setPasswordError('');
                }}
                onKeyDown={onFieldKeyDown}
                className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#18181a] outline-none placeholder:text-[#757f9c]"
              />
              <button
                type="button"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="grid size-[18px] shrink-0 place-items-center text-[#677185] outline-none transition-colors hover:text-[#464c5e]"
              >
                {showPassword ? (
                  <IconFieldEyeOn className="size-[18px]" />
                ) : (
                  <IconFieldEye className="size-[18px]" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-[28px] flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#2563EB] text-[16px] font-medium text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? '登录中…' : '登录'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
