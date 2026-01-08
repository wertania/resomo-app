/**
 * A simple wrapper around fetch to make it easier to use
 * and to have a central place to add authentication and the backend url
 */

export const API_BASE_URL = {
  path: '',
};

export const fetcher = {
  // get
  async get<T>(url: string, returnAsText = false): Promise<T> {
    const response = await fetch(API_BASE_URL.path + url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (returnAsText) {
      return response.text() as any;
    } else {
      return response.json();
    }
  },

  // getBlob
  async getBlob(url: string): Promise<Blob> {
    const response = await fetch(API_BASE_URL.path + url, {});
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.blob();
  },

  // post
  async post<T>(url: string, body: any, returnAsText = false): Promise<T> {
    const response = await fetch(API_BASE_URL.path + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (returnAsText) {
      return response.text() as any;
    } else {
      return response.json();
    }
  },

  // postFormData
  async postFormData<T>(url: string, formData: FormData, returnAsText = false): Promise<T> {
    const response = await fetch(API_BASE_URL.path + url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (returnAsText) {
      return response.text() as any;
    } else {
      return response.json();
    }
  },

  // put
  async put<T>(url: string, body: any, returnAsText = false): Promise<T> {
    const response = await fetch(API_BASE_URL.path + url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (returnAsText) {
      return response.text() as any;
    } else {
      return response.json();
    }
  },

  // patch
  async patch<T>(url: string, body: any, returnAsText = false): Promise<T> {
    const response = await fetch(API_BASE_URL.path + url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (returnAsText) {
      return response.text() as any;
    } else {
      return response.json();
    }
  },

  // delete
  async delete<T>(url: string, returnAsText = false): Promise<T> {
    const response = await fetch(API_BASE_URL.path + url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (returnAsText) {
      return response.text() as any;
    } else {
      return response.json();
    }
  },
};
