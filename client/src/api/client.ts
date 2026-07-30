import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      let message = error.response.data?.error ?? "Something went wrong";

      // If it is a validation error, extract details to show in the frontend
      if (message === "Validation failed" && error.response.data?.details) {
        const { fieldErrors, formErrors } = error.response.data.details;
        const messages: string[] = [];
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, errors]) => {
            if (Array.isArray(errors) && errors.length > 0) {
              messages.push(`${field}: ${errors.join(", ")}`);
            }
          });
        }
        if (formErrors && Array.isArray(formErrors) && formErrors.length > 0) {
          messages.push(...formErrors);
        }
        if (messages.length > 0) {
          message = `Validation failed: ${messages.join("; ")}`;
        }
      }

      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);
