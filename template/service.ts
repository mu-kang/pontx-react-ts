import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { notification } from "antd";
import qs from "qs";
import Cookies from "js-cookie";
import useSwr, { SWRConfiguration, SWRResponse } from "swr";
/** 后端返回的数据类型 */
// type ResponseData<T> = T;
type ResponseData<T> = {
  code: number;
  data: T;
  message: string;
};
/** 创建axios实例 */
const axiosInstance: AxiosInstance = axios.create({
  timeout: 100000,
  // baseURL: import.meta.env.VITE_BASE_URL,
});
/** 异常拦截处理器 */
const errorHandler = (error: AxiosError<ResponseData<string>>) => {
  console.log("error", error.response);
  if (error.response) {
    switch (error.response.status) {
      case 403:
        // 登录过期错误处理
        Cookies.set("Authorization", "");
        break;
      case 401:
        // 登录过期错误处理
        Cookies.set("Authorization", "");
        break;

      default:
        notification.error({
          message: error.response.status,
          description: `${error.response?.data?.message || error.message}`,
        });
    }
  }
  return Promise.reject(error);
};
/** 请求拦截处理器 */
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const Authorization = Cookies.get("Authorization");
  if (Authorization && config.headers) {
    config.headers.Authorization = Authorization;
  }

  // qs是axios自带的序列化参数方式
  if (
    config.headers &&
    config.headers["Content-Type"] &&
    (config.headers["Content-Type"] as string).includes(
      "application/x-www-form-urlencoded"
    )
  ) {
    config.params = qs.stringify(config.params);
  }
  return config;
}, errorHandler);
/** 响应拦截处理器 */
axiosInstance.interceptors.response.use((response: AxiosResponse) => {
  return response;
}, errorHandler);
/***
 * @name axios 请求封装
 * @config AxiosRequestConfig
 * */
export function service<T>(config: AxiosRequestConfig): Promise<T> {
  return new Promise((resolve, reject) => {
    axiosInstance
      .request<T, AxiosResponse<ResponseData<T>>>(config)
      .then((result: AxiosResponse<ResponseData<T>>) => {
        const { data } = result;
        // resolve(data);
        if (data.code === 1) {
          resolve(data.data);
        } else {
          reject(data);
        }
      })
      .catch((err: AxiosError) => {
        reject(err);
      });
  });
}
/***
 * @name useService 请求封装
 * @config AxiosRequestConfig
 * @options SWRConfiguration
 * SWRResponse
 * */
export function useService<T>(
  config: AxiosRequestConfig,
  options?: SWRConfiguration | null
): SWRResponse<T> {
  const { isLoading, error, ...other } = useSwr(
    options
      ? `${config.url}${qs.stringify(config.params || {})}${qs.stringify(
          config.data || {}
        )}`
      : null,
    () => service<T>(config),
    options || {}
  );
  return { ...other, isLoading: error ? false : isLoading, error };
}
