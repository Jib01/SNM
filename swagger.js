const swaggerAutogen = require('swagger-autogen');

const doc = {
  info: {
    title: 'SNM API',
    description: 'API per il progetto "Social Network for Music"'
  },
  host: 'localhost:3004',
};


const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js'];


swaggerAutogen(outputFile, endpointsFiles, doc).then(async () => {
  await import('./server.js');
});
