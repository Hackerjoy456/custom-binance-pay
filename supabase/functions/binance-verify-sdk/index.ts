const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const verifyEndpoint = `${supabaseUrl}/functions/v1/verify-payment`;
  const configEndpoint = `${supabaseUrl}/functions/v1/get-config`;

  const code = `(function(global) {
  var BinanceVerify = {};
  var _config = {};

  /**
   * Initialize BinanceVerify SDK
   * @param {Object} config
   * @param {string} config.apiKey - Your API key (required)
   * @param {string} [config.endpoint] - Custom verify endpoint URL
   * @param {function} [config.onSuccess] - Called on successful verification
   * @param {function} [config.onError] - Called on failed verification
   */
  BinanceVerify.init = function(config) {
    _config = config || {};
    if (!_config.apiKey) {
      console.warn('BinanceVerify: apiKey is required in init()');
    }
  };

  /**
   * Verify a payment transaction
   * @param {Object} options
   * @param {string} options.transactionId - The transaction/prepay ID
   * @param {string} options.paymentType - "bep20" or "binance_pay"
   * @param {number} options.expectedAmount - Expected payment amount
   * @returns {Promise<Object>} Verification result
   */
  BinanceVerify.verify = function(options) {
    if (!_config.apiKey) {
      return Promise.reject(new Error('BinanceVerify not initialized. Call BinanceVerify.init({ apiKey: "..." }) first.'));
    }

    var ep = _config.endpoint || '${verifyEndpoint}';

    return fetch(ep, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': _config.apiKey
      },
      body: JSON.stringify({
        transaction_id: options.transactionId,
        payment_type: options.paymentType,
        expected_amount: options.expectedAmount
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.verified && _config.onSuccess) _config.onSuccess(data);
      if (!data.verified && _config.onError) _config.onError(data);
      return data;
    })
    .catch(function(err) {
      if (_config.onError) _config.onError({ verified: false, error: err.message });
      throw err;
    });
  };

  /**
   * Fetch your payment configuration (Binance Pay ID, BEP20 address, images)
   * @returns {Promise<Object>} Config with binance_pay and bep20 sections
   */
  BinanceVerify.fetchPaymentConfig = function() {
    if (!_config.apiKey) {
      return Promise.reject(new Error('BinanceVerify not initialized. Call BinanceVerify.init({ apiKey: "..." }) first.'));
    }

    var base = _config.endpoint || '${verifyEndpoint}';
    // Derive config endpoint from verify endpoint
    var configUrl = base.replace(/\\/verify-payment$/, '/get-config');
    // If custom endpoint doesn't match, use default
    if (configUrl === base) {
      configUrl = '${configEndpoint}';
    }

    return fetch(configUrl, {
      method: 'GET',
      headers: {
        'x-api-key': _config.apiKey
      }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        if (_config.onError) _config.onError(data);
      }
      return data;
    })
    .catch(function(err) {
      if (_config.onError) _config.onError({ error: err.message });
      throw err;
    });
  };

  /** Get SDK info (for debugging) */
  BinanceVerify.getConfig = function() {
    return { 
      endpoint: _config.endpoint || '${verifyEndpoint}', 
      configEndpoint: '${configEndpoint}',
      hasApiKey: !!_config.apiKey 
    };
  };

  global.BinanceVerify = BinanceVerify;
})(typeof window !== 'undefined' ? window : this);`;

  return new Response(code, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
