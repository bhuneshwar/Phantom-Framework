module.exports = {
  apps: [
    {
      name: 'phantom-framework',
      script: './dist/app.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Memory and performance settings
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 1000,
      
      // Environment settings
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SPECTRAL_MODE: 'coven',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        SPECTRAL_MODE: 'single',
        DEBUG: 'phantom:*',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        SPECTRAL_MODE: 'coven',
      },
      
      // Logging configuration
      log_file: './logs/phantom-combined.log',
      out_file: './logs/phantom-out.log',
      error_file: './logs/phantom-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring and health checks
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Advanced PM2 features
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', 'coverage', '.git'],
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Source map support
      source_map_support: true,
      
      // Instance variables for load balancing
      instance_var: 'INSTANCE_ID',
      
      // Graceful shutdown
      wait_ready: true,
      shutdown_with_message: true,
    },
    
    // Veiled Voices Demo
    {
      name: 'veiled-voices-demo',
      script: './demos/veiled/app.js',
      instances: 1, // Single instance for WebRTC coordination
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DEMO_MODE: 'veiled',
        SPECTRAL_INTENSITY: 'terrifying',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        DEMO_MODE: 'veiled',
        DEBUG: 'phantom:veiled:*',
      },
      
      max_memory_restart: '300M',
      min_uptime: '5s',
      max_restarts: 3,
      
      log_file: './logs/veiled-combined.log',
      out_file: './logs/veiled-out.log',
      error_file: './logs/veiled-error.log',
      
      watch: false,
      autorestart: true,
    },
    
    // Cauldron Concoctions Demo
    {
      name: 'cauldron-demo',
      script: './demos/cauldron/app.js',
      instances: 2, // Multiple instances for ML processing
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DEMO_MODE: 'cauldron',
        SPECTRAL_INTENSITY: 'moderate',
        ML_WORKERS: 2,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3002,
        DEMO_MODE: 'cauldron',
        DEBUG: 'phantom:cauldron:*',
      },
      
      max_memory_restart: '800M', // Higher for ML processing
      min_uptime: '10s',
      max_restarts: 3,
      
      log_file: './logs/cauldron-combined.log',
      out_file: './logs/cauldron-out.log',
      error_file: './logs/cauldron-error.log',
      
      watch: false,
      autorestart: true,
      
      // ML-specific settings
      node_args: '--max-old-space-size=1024',
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'phantom',
      host: ['phantom-server-1', 'phantom-server-2'],
      ref: 'origin/main',
      repo: 'git@github.com:phantom-framework/phantom-framework.git',
      path: '/var/www/phantom-framework',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install nodejs npm git -y'
    },
    
    staging: {
      user: 'phantom-staging',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'git@github.com:phantom-framework/phantom-framework.git',
      path: '/var/www/phantom-framework-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};