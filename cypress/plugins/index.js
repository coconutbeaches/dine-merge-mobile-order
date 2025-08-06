const { spawn } = require('child_process');
const path = require('path');

let dummyOrderProcess = null;

module.exports = (on, config) => {
  on('task', {
    startDummyOrderInsertion() {
      if (dummyOrderProcess) {
        console.log('Dummy order insertion already running');
        return null;
      }

      console.log('Starting dummy order insertion process...');
      
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'insert-dummy-orders.js');
      dummyOrderProcess = spawn('node', [scriptPath, 'start'], {
        stdio: 'pipe',
        detached: false
      });

      dummyOrderProcess.stdout.on('data', (data) => {
        console.log(`[DummyOrders] ${data.toString().trim()}`);
      });

      dummyOrderProcess.stderr.on('data', (data) => {
        console.error(`[DummyOrders Error] ${data.toString().trim()}`);
      });

      dummyOrderProcess.on('exit', (code) => {
        console.log(`[DummyOrders] Process exited with code ${code}`);
        dummyOrderProcess = null;
      });

      // Give it a moment to start
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve('Dummy order insertion started');
        }, 2000);
      });
    },

    stopDummyOrderInsertion() {
      if (!dummyOrderProcess) {
        console.log('No dummy order process to stop');
        return null;
      }

      console.log('Stopping dummy order insertion process...');
      
      // Send SIGTERM to gracefully shutdown
      dummyOrderProcess.kill('SIGTERM');
      
      return new Promise((resolve) => {
        setTimeout(() => {
          if (dummyOrderProcess) {
            // Force kill if still running
            dummyOrderProcess.kill('SIGKILL');
            dummyOrderProcess = null;
          }
          resolve('Dummy order insertion stopped');
        }, 3000);
      });
    },

    cleanupDummyOrders() {
      console.log('Cleaning up dummy orders...');
      
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'insert-dummy-orders.js');
      const cleanupProcess = spawn('node', [scriptPath, 'cleanup'], {
        stdio: 'pipe'
      });

      return new Promise((resolve, reject) => {
        let output = '';
        
        cleanupProcess.stdout.on('data', (data) => {
          output += data.toString();
          console.log(`[Cleanup] ${data.toString().trim()}`);
        });

        cleanupProcess.stderr.on('data', (data) => {
          console.error(`[Cleanup Error] ${data.toString().trim()}`);
        });

        cleanupProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Cleanup process exited with code ${code}`));
          }
        });
      });
    }
  });

  // Cleanup on process exit
  process.on('exit', () => {
    if (dummyOrderProcess) {
      dummyOrderProcess.kill('SIGTERM');
    }
  });

  process.on('SIGINT', () => {
    if (dummyOrderProcess) {
      dummyOrderProcess.kill('SIGTERM');
    }
    process.exit(0);
  });

  return config;
};
