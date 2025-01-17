/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { diag, SpanAttributeValue, SpanAttributes } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

export function sanitizeAttributes(attributes: unknown): SpanAttributes {
  const out: SpanAttributes = {};

  if (typeof attributes !== 'object' || attributes == null) {
    return out;
  }

  for (const [key, val] of Object.entries(attributes)) {
    if (!isAttributeKey(key)) {
      diag.warn(`Invalid attribute key: ${key}`);
      continue;
    }
    if (!isAttributeValue(val)) {
      diag.warn(`Invalid attribute value set for key: ${key}`);
      continue;
    }
    if (key === SemanticAttributes.HTTP_URL && typeof val === 'string') {
      out[key] = sanitizeAttributesUsingUrl(val);
      continue;
    }
    if (Array.isArray(val)) {
      out[key] = val.slice();
    } else {
      out[key] = val;
    }
  }

  return out;
}

export function isAttributeKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0;
}

export function isAttributeValue(val: unknown): val is SpanAttributeValue {
  if (val == null) {
    return true;
  }

  if (Array.isArray(val)) {
    return isHomogeneousAttributeValueArray(val);
  }

  return isValidPrimitiveAttributeValue(val);
}

function isHomogeneousAttributeValueArray(arr: unknown[]): boolean {
  let type: string | undefined;

  for (const element of arr) {
    // null/undefined elements are allowed
    if (element == null) continue;

    if (!type) {
      if (isValidPrimitiveAttributeValue(element)) {
        type = typeof element;
        continue;
      }
      // encountered an invalid primitive
      return false;
    }

    if (typeof element === type) {
      continue;
    }

    return false;
  }

  return true;
}

function isValidPrimitiveAttributeValue(val: unknown): boolean {
  switch (typeof val) {
    case 'number':
    case 'boolean':
    case 'string':
      return true;
  }

  return false;
}

function sanitizeAttributesUsingUrl(val: string): string {
  try {
    const url = new URL(val);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch (e) {
    diag.warn(
      `Invalid attribute value set for key: ${SemanticAttributes.HTTP_URL}. Unable to sanitize invalid URL.`
    );
    return val;
  }
}
