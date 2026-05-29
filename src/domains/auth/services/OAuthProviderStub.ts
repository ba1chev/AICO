export type OAuthProviderId = 'google' | 'github';

export interface OAuthProfile {
  email: string;
  displayName: string;
  provider: OAuthProviderId;
}

export class OAuthProviderStub {
  async authorize(provider: OAuthProviderId): Promise<OAuthProfile> {
    await new Promise((r) => setTimeout(r, 400));
    const handle = provider === 'google' ? 'demo.user' : 'demo-user';
    return {
      email: `${handle}@${provider}.example`,
      displayName: provider === 'google' ? 'Demo Google User' : 'Demo GitHub User',
      provider,
    };
  }
}
