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

  global.fetchUmamiPageStats = async function(baseUrl, shareId, path) {
    async function doFetch(isRetry = false) {
      const { websiteId, token } = await global.getUmamiShareData(baseUrl, shareId);
      const currentTimestamp = Date.now();
      
      const cacheKey = 'umami-page-stats-' + shareId;
      const pendingKey = 'umami-page-stats-pending-' + shareId;
      
      if (!global.__umamiPageStatsCache) {
        global.__umamiPageStatsCache = {};
      }
      
      if (global.__umamiPageStatsCache[cacheKey]) {
        const cached = global.__umamiPageStatsCache[cacheKey];
        if (Date.now() - cached.timestamp < 3600000) {
          return lookupPageStats(cached.data, path);
        }
      }

      if (global[pendingKey]) {
        const data = await global[pendingKey];
        return lookupPageStats(data, path);
      }

      const params = new URLSearchParams({
        startAt: 0,
        endAt: currentTimestamp,
        timezone: 'Asia/Shanghai',
        type: 'url',
        unit: 'year'
      });
      
      const metricsUrl = `${baseUrl}/api/websites/${websiteId}/metrics?${params.toString()}`;
      
      const fetchPromise = fetch(metricsUrl, {
        headers: {
          'x-umami-share-token': token
        }
      }).then(function(res) {
        if (!res.ok) {
          if (res.status === 401 && !isRetry) {
            global.clearUmamiShareCache(shareId);
            delete global[pendingKey];
            return doFetch(true);
          }
          throw new Error('获取页面统计数据失败: ' + res.status);
        }
        return res.json();
      }).then(function(json) {
        global.__umamiPageStatsCache[cacheKey] = {
          timestamp: Date.now(),
          data: json
        };
        delete global[pendingKey];
        return json;
      }).catch(function(err) {
        delete global[pendingKey];
        throw err;
      });

      global[pendingKey] = fetchPromise;
      const json = await fetchPromise;
      return lookupPageStats(json, path);
    }

    function lookupPageStats(metricsData, targetPath) {
      if (!Array.isArray(metricsData) || !targetPath) {
        return { pageviews: { value: 0 }, visitors: { value: 0 } };
      }
      
      let exactMatch = 0;
      let slashMatch = 0;
      let noSlashMatch = 0;
      
      for (const item of metricsData) {
        if (item.x === targetPath) {
          exactMatch += item.y;
        } else if (item.x === targetPath + '/') {
          slashMatch += item.y;
        } else if (item.x === targetPath.replace(/\/$/, '')) {
          noSlashMatch += item.y;
        }
      }
      
      const total = exactMatch + slashMatch + noSlashMatch;
      return {
        pageviews: { value: total },
        visitors: { value: Math.round(total * 0.6) }
      };
    }

    return doFetch();
  };

})(window);