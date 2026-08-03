import type { RichAccount } from './settingsService.js';

const CLIENT_ID = '9a4086b2-7c1c-4b35-a789-da4c015b65d6'; // Public registered Client ID for Minecraft Auth
const SCOPE = 'XboxLive.signin offline_access';

export class MicrosoftAuthService {
  private static activePollCode: string | null = null;

  /**
   * Request device authorization details from Microsoft
   */
  static async startDeviceCodeFlow(): Promise<{
    userCode: string;
    deviceCode: string;
    verificationUri: string;
    interval: number;
    expiresIn: number;
  }> {
    const url = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode';
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('scope', SCOPE);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to initialize Device Code Flow: ${err}`);
    }

    const json = await res.json() as any;
    return {
      userCode: json.user_code,
      deviceCode: json.device_code,
      verificationUri: json.verification_uri,
      interval: json.interval || 5,
      expiresIn: json.expires_in || 900,
    };
  }

  /**
   * Complete Xbox Live, XSTS, Minecraft token exchange and get Profile
   */
  static async exchangeCodeForMinecraftProfile(msAccessToken: string, msRefreshToken: string): Promise<RichAccount> {
    // 1. Authenticate with Xbox Live
    const xblRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${msAccessToken}`,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      }),
    });

    if (!xblRes.ok) {
      throw new Error(`Xbox Live Auth failed: ${await xblRes.text()}`);
    }

    const xblJson = await xblRes.json() as any;
    const xblToken = xblJson.Token;
    const userHash = xblJson.DisplayClaims?.xui?.[0]?.uhs;

    if (!xblToken || !userHash) {
      throw new Error('Could not extract Xbox Live claims or token');
    }

    // 2. Authorize with XSTS
    const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblToken],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
      }),
    });

    if (!xstsRes.ok) {
      throw new Error(`XSTS Authorization failed: ${await xstsRes.text()}`);
    }

    const xstsJson = await xstsRes.json() as any;
    const xstsToken = xstsJson.Token;

    if (!xstsToken) {
      throw new Error('Could not extract XSTS token');
    }

    // 3. Login to Minecraft
    const mcLoginRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
      }),
    });

    if (!mcLoginRes.ok) {
      throw new Error(`Minecraft Services Auth failed: ${await mcLoginRes.text()}`);
    }

    const mcLoginJson = await mcLoginRes.json() as any;
    const mcAccessToken = mcLoginJson.access_token;
    const expiresIn = mcLoginJson.expires_in || 86400;
    const expiresAt = Date.now() + (expiresIn - 300) * 1000; // Subtract 5 mins buffer

    if (!mcAccessToken) {
      throw new Error('Could not retrieve Minecraft access token');
    }

    // 4. Retrieve Minecraft Profile
    const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mcAccessToken}`,
      },
    });

    if (!profileRes.ok) {
      throw new Error(`Failed to fetch Minecraft profile (Check if game is purchased on this account): ${await profileRes.text()}`);
    }

    const profileJson = await profileRes.json() as any;
    const username = profileJson.name;
    const uuid = profileJson.id;

    if (!username || !uuid) {
      throw new Error('Active Minecraft profile not found or account lacks license.');
    }

    return {
      name: username,
      uuid: uuid,
      type: 'microsoft',
      accessToken: mcAccessToken,
      refreshToken: msRefreshToken,
      expiresAt: expiresAt,
    };
  }

  /**
   * Quietly and seamlessly refresh a Microsoft Account
   */
  static async refreshAccount(account: RichAccount): Promise<RichAccount> {
    if (!account.refreshToken) {
      throw new Error('Account does not have a refresh token.');
    }

    console.log(`Refreshing Microsoft Access Token for account: ${account.name}`);
    const url = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', CLIENT_ID);
    params.append('refresh_token', account.refreshToken);
    params.append('scope', SCOPE);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Refresh token endpoint returned error: ${await res.text()}`);
    }

    const json = await res.json() as any;
    const msAccessToken = json.access_token;
    const msRefreshToken = json.refresh_token || account.refreshToken;

    if (!msAccessToken) {
      throw new Error('Failed to retrieve refreshed Microsoft access token');
    }

    const refreshedAccount = await this.exchangeCodeForMinecraftProfile(msAccessToken, msRefreshToken);
    return refreshedAccount;
  }

  /**
   * Start polling for authorization
   */
  static async pollDeviceToken(
    deviceCode: string,
    interval: number,
    onStatus: (status: 'WAITING' | 'SUCCESS' | 'EXPIRED' | 'ERROR', details?: string | RichAccount) => void
  ): Promise<void> {
    this.activePollCode = deviceCode;
    const pollUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
    params.append('client_id', CLIENT_ID);
    params.append('device_code', deviceCode);

    const poll = async () => {
      if (this.activePollCode !== deviceCode) return; // Cancel if flow restarted or stopped

      try {
        const res = await fetch(pollUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const data = await res.json() as any;

        if (res.ok) {
          if (data.access_token) {
            console.log('Microsoft OAuth Token exchange success! Fetching Minecraft credentials...');
            const richAccount = await this.exchangeCodeForMinecraftProfile(data.access_token, data.refresh_token);
            onStatus('SUCCESS', richAccount);
          } else {
            onStatus('ERROR', 'OAuth did not return access token');
          }
          return;
        }

        const error = data.error;
        if (error === 'authorization_pending') {
          onStatus('WAITING');
          setTimeout(poll, interval * 1000);
        } else if (error === 'authorization_declined') {
          onStatus('ERROR', 'Authorization declined by user.');
        } else if (error === 'expired_token') {
          onStatus('EXPIRED');
        } else {
          onStatus('ERROR', data.error_description || error);
        }
      } catch (err: any) {
        onStatus('ERROR', err.message);
      }
    };

    setTimeout(poll, interval * 1000);
  }

  static stopPolling(): void {
    this.activePollCode = null;
  }
}
