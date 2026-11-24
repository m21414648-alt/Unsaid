import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import MainBoard from '@/pages/main-board';
import Settings from '@/pages/settings';
import Feelings from '@/pages/feelings';
import Touch from '@/pages/touch';
import { FontSettingsProvider } from '@/context/font-settings';
import { ColorThemeProvider } from '@/context/color-theme';
import { AssistantSettingsProvider } from '@/context/assistant-settings';
import { DrawingDraftProvider } from '@/context/drawing-draft';
import { VoiceSettingsProvider } from '@/context/voice-settings';
import { AccountProvider, AccountPage, ClerkQueryClientCacheInvalidator } from '@/components/account-auth';
import { useAuth } from '@clerk/react';
import Family from '@/pages/family';
import FamilyActivity from '@/pages/family-activity';
import OwnerProgress from '@/pages/owner-progress';
import { HomeAccountLinks } from '@/components/home-account-links';
import { PushAuthGuard } from '@/components/push-auth-guard';
import '@/pages/family.css';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    document.title = 'Unsaid — مساحة للتواصل';
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  return (
    <main className="welcome-screen" dir="rtl">
      <div className="sky-decorations" aria-hidden="true">
        <svg
          className="sky-decorations__scene"
          viewBox="0 0 402 874"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="sun-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
            <filter id="cloud-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.7" />
            </filter>
          </defs>
          <g className="sky-cloud sky-cloud--one" filter="url(#cloud-blur)">
            <path
              d="M-24 150C-2 126 33 127 52 151C67 130 103 133 114 164C137 160 155 176 155 198H-24V150Z"
              fill="#FFFFFF"
              fillOpacity="0.9"
            />
          </g>
          <g className="sky-cloud sky-cloud--three" filter="url(#cloud-blur)">
            <path
              d="M152 68C169 48 198 50 212 70C225 53 254 57 262 81C281 78 294 91 294 108H152V68Z"
              fill="#E0F2FE"
              fillOpacity="0.88"
            />
          </g>
          <g className="sky-cloud sky-cloud--two" filter="url(#cloud-blur)">
            <path
              d="M269 174C285 153 315 155 329 177C345 159 376 166 384 190C404 187 420 201 420 220H269V174Z"
              fill="#FFFFFF"
              fillOpacity="0.86"
            />
          </g>
          <circle
            className="sky-sun__glow"
            cx="329"
            cy="111"
            r="44"
            fill="#FACC15"
            fillOpacity="0.45"
            filter="url(#sun-glow)"
          />
          <circle className="sky-sun" cx="329" cy="111" r="34" fill="#FACC15" />
        </svg>
      </div>

      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-art" aria-hidden="true">
          <svg
            className="kite-scene"
            viewBox="0 0 402 380"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(-112 0)">
              <g className="kite-scene__floating">
                <g className="kite-scene__kite-group" transform="rotate(8 315 105)">
                  <path
                    className="kite-scene__kite-face"
                    d="M315 29C317 29 320 31 322 34L373 96C375 99 375 101 372 104L319 164C317 167 314 168 311 164L257 103C255 101 255 98 257 96L309 34C311 31 313 29 315 29Z"
                  />
                    <path
                      className="kite-scene__kite-panel kite-scene__kite-panel--sky"
                    d="M315 35L367 99L316 99L315 35Z"
                  />
                  <path
                      className="kite-scene__kite-panel kite-scene__kite-panel--navy"
                    d="M316 99L367 99L316 159V99Z"
                  />
                  <path
                      className="kite-scene__kite-panel kite-scene__kite-panel--white"
                    d="M316 99L265 99L315 35L316 99Z"
                  />
                  <path
                    className="kite-scene__kite-seam"
                    d="M315 35V161M264 99H368"
                  />
                  <circle className="kite-scene__eye" cx="303" cy="107" r="3" />
                  <circle className="kite-scene__eye" cx="326" cy="107" r="3" />
                  <path
                    className="kite-scene__smile"
                    d="M306 120C311 126 318 126 323 120"
                  />
                  <path
                    className="kite-scene__string"
                    d="M315 164C344 192 293 216 320 245C347 274 306 294 325 319C338 337 329 352 312 367"
                  />
                  <g className="kite-scene__tail-swing">
                    <path
                      className="kite-scene__ribbon kite-scene__ribbon--sky"
                      d="M313 164C335 181 299 202 324 220C343 234 332 248 316 259"
                    />
                    <path
                      className="kite-scene__ribbon kite-scene__ribbon--navy"
                      d="M320 165C296 184 335 201 309 221C290 237 302 252 322 266"
                    />
                    <path
                      className="kite-scene__ribbon kite-scene__ribbon--white"
                      d="M315 166C325 188 304 200 333 216C352 227 345 243 337 254"
                    />
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>

        <div className="welcome-content">
          <div className="welcome-copy">
            <h1 className="welcome-title" id="welcome-title" data-testid="text-app-name">
              Unsaid
            </h1>
            <p className="welcome-tagline" data-testid="text-tagline">
              لأن لكل شخص صوتًا يستحق أن يُسمع.
            </p>
          </div>

          <button
            className="start-button"
            type="button"
            data-testid="button-start"
            onClick={() => setLocation('/board')}
          >
            <span>{isSignedIn ? 'استمر' : 'ابدأ'}</span>
            <svg
              className="start-button__icon"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="M5 12H19M13 6L19 12L13 18" />
            </svg>
          </button>
          <HomeAccountLinks />
        </div>
      </section>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sign-in/*?"><AccountPage /></Route>
        <Route path="/sign-up/*?"><AccountPage signup /></Route>
        <Route path="/board" component={MainBoard} />
        <Route path="/feelings" component={Feelings} />
        <Route path="/settings" component={Settings} />
        <Route path="/touch" component={Touch} />
        <Route path="/family" component={Family} />
        <Route path="/family/activity/:id" component={FamilyActivity} />
        <Route path="/admin/feelings/progress" component={OwnerProgress} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <FontSettingsProvider>
            <ColorThemeProvider>
              <AccountProvider>
                <ClerkQueryClientCacheInvalidator />
                <PushAuthGuard />
                <DrawingDraftProvider>
                  <VoiceSettingsProvider>
                    <AssistantSettingsProvider>
                      <Router />
                    </AssistantSettingsProvider>
                  </VoiceSettingsProvider>
                </DrawingDraftProvider>
              </AccountProvider>
            </ColorThemeProvider>
          </FontSettingsProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
