type CreationOptionsJSON = Parameters<typeof PublicKeyCredential.parseCreationOptionsFromJSON>[0];
type RequestOptionsJSON = Parameters<typeof PublicKeyCredential.parseRequestOptionsFromJSON>[0];

type AssertionResponseLike = {
  authenticatorData: ArrayBuffer;
  clientDataJSON: ArrayBuffer;
  signature: ArrayBuffer;
  userHandle?: ArrayBuffer | null;
};

type AttestationResponseLike = {
  attestationObject: ArrayBuffer;
  clientDataJSON: ArrayBuffer;
  getTransports?: () => string[];
};

type CredentialLike = {
  id: string;
  rawId: ArrayBuffer;
  response: AssertionResponseLike | AttestationResponseLike;
  authenticatorAttachment?: string | null;
  type: string;
};

function encodeBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64URL(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function isAssertionResponse(
  response: CredentialLike['response']
): response is AssertionResponseLike {
  return 'authenticatorData' in response;
}

function parseCredentialDescriptor(credential: {
  id: string;
  transports?: string[];
  type: string;
}): PublicKeyCredentialDescriptor {
  return {
    ...credential,
    id: decodeBase64URL(credential.id),
    transports: credential.transports as AuthenticatorTransport[] | undefined,
    type: credential.type as PublicKeyCredentialType,
  };
}

export function parseCreationOptionsFromJSON(
  options: CreationOptionsJSON
): PublicKeyCredentialCreationOptions {
  return {
    ...options,
    challenge: decodeBase64URL(options.challenge),
    user: {
      ...options.user,
      id: decodeBase64URL(options.user.id),
    },
    excludeCredentials:
      options.excludeCredentials?.map((credential) => parseCredentialDescriptor(credential)) ?? [],
  } as PublicKeyCredentialCreationOptions;
}

export function parseRequestOptionsFromJSON(
  options: RequestOptionsJSON
): PublicKeyCredentialRequestOptions {
  return {
    ...options,
    challenge: decodeBase64URL(options.challenge),
    allowCredentials:
      options.allowCredentials?.map((credential) => parseCredentialDescriptor(credential)) ?? [],
  } as PublicKeyCredentialRequestOptions;
}

export function toJSON(this: CredentialLike): ReturnType<PublicKeyCredential['toJSON']> {
  const base = {
    id: this.id,
    rawId: encodeBase64URL(this.rawId),
    authenticatorAttachment: this.authenticatorAttachment,
    clientExtensionResults: {},
    type: this.type,
  };

  if (isAssertionResponse(this.response)) {
    return {
      ...base,
      response: {
        authenticatorData: encodeBase64URL(this.response.authenticatorData),
        clientDataJSON: encodeBase64URL(this.response.clientDataJSON),
        signature: encodeBase64URL(this.response.signature),
        userHandle: this.response.userHandle
          ? encodeBase64URL(this.response.userHandle)
          : undefined,
      },
    };
  }

  return {
    ...base,
    response: {
      attestationObject: encodeBase64URL(this.response.attestationObject),
      clientDataJSON: encodeBase64URL(this.response.clientDataJSON),
      transports: this.response.getTransports?.() ?? [],
    },
  };
}

function applyWebAuthnJSONPolyfill(): void {
  if (!globalThis.PublicKeyCredential) {
    return;
  }

  if (!PublicKeyCredential.parseCreationOptionsFromJSON) {
    Object.defineProperty(PublicKeyCredential, 'parseCreationOptionsFromJSON', {
      value: parseCreationOptionsFromJSON,
    });
  }

  if (!PublicKeyCredential.parseRequestOptionsFromJSON) {
    Object.defineProperty(PublicKeyCredential, 'parseRequestOptionsFromJSON', {
      value: parseRequestOptionsFromJSON,
    });
  }

  if (!PublicKeyCredential.prototype.toJSON) {
    Object.defineProperty(PublicKeyCredential.prototype, 'toJSON', {
      value: toJSON,
    });
  }
}

applyWebAuthnJSONPolyfill();
