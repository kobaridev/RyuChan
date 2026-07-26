(function (global) {
  const cacheKeyPrefix = 'umami-share-cache-';
  const cacheTTL = 3600_000;

  async function fetchShareData(baseUrl, shareId) {
    const key = cacheKeyPrefix + shareId;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < cacheTTL) {
          return parsed.value;
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
    const res = await fetch(`${baseUrl}/api/share/${shareId}`);
    if (!res.ok) {
      throw new Error('获取 Umami 分享信息失败');
    }
    const data = await res.json();
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), value: data }));
    return data;
  }

  global.getUmamiShareData = function (baseUrl, shareId) {
    if (!global.__umamiSharePromise) {
      global.__umamiSharePromise = fetchShareData(baseUrl, shareId).catch((err) => {
        delete global.__umamiSharePromise;
        throw err;
      });
    }
    return global.__umamiSharePromise;
  };

  global.clearUmamiShareCache = function (shareId) {
    const key = cacheKeyPrefix + shareId;
    localStorage.removeItem(key);
    localStorage.removeItem('umami-share-cache');
    delete global.__umamiSharePromise;
  };

  global.fetchUmamiStats = async function (baseUrl, shareId, queryParams) {
    async function doFetch(isRetry = false) {
      const { websiteId, token } = await global.getUmamiShareData(baseUrl, shareId);
      const currentTimestamp = Date.now();
      
      const params = new URLSearchParams({
        startAt: 0,
        endAt: currentTimestamp,
        timezone: 'Asia/Shanghai',
        compare: false,
        ...queryParams
      });
      
      const statsUrl = `${baseUrl}/api/websites/${websiteId}/stats?${params.toString()}`;
      
      const res = await fetch(statsUrl, {
        headers: {
          'x-umami-share-token': token
        }
      });

      if (!res.ok) {
        if (res.status === 401 && !isRetry) {
          global.clearUmamiShareCache(shareId);
          return doFetch(true);
        }
        throw new Error('获取统计数据失败: ' + res.status);
      }

      const json = await res.json();
      return json;
    }

    return doFetch();
  };

})(window);