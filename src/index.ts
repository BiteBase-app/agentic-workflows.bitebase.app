import express from 'express';
import { createApp } from './server';
import { DbService } from './services/db-service';
import { BiteBaseService } from './services/bitebase-service';

// Adapter function to convert Express app to Cloudflare Worker handler
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Create a URL object from the request URL
    const url = new URL(request.url);
    
    // Cloudflare Workers specific environment bindings
    global.DB = env.DB;
    global.ENV = env;
    
    // Initialize services with Cloudflare D1
    const dbService = new DbService(env.DB);
    const biteBaseService = new BiteBaseService();
    
    // Create application with our services
    const app = createApp({
      dbService,
      biteBaseService
    });
    
    // Convert request to Express-compatible format
    const expressRequest = {
      method: request.method,
      url: url.pathname + url.search,
      headers: Object.fromEntries(request.headers),
      body: request.body,
      query: Object.fromEntries(url.searchParams),
      params: {},
    };
    
    // Create a response object to capture Express response
    const expressResponse = {
      statusCode: 200,
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      body: null as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      set(name: string, value: string) {
        this.headers.set(name, value);
        return this;
      },
      json(data: any) {
        this.body = JSON.stringify(data);
        return this;
      },
      send(data: any) {
        if (typeof data === 'object') {
          this.body = JSON.stringify(data);
        } else {
          this.body = data.toString();
        }
        return this;
      }
    };
    
    // Process the request through Express
    return new Promise((resolve) => {
      // Mock the next function
      const next = (error?: any) => {
        if (error) {
          expressResponse.status(500).json({ error: error.message });
          resolve(new Response(expressResponse.body, {
            status: expressResponse.statusCode,
            headers: expressResponse.headers
          }));
        }
      };
      
      // Handle the request with Express
      try {
        app._router.handle(expressRequest, expressResponse, next);
        
        // Wait a short time to allow async handlers to complete
        setTimeout(() => {
          resolve(new Response(expressResponse.body, {
            status: expressResponse.statusCode,
            headers: expressResponse.headers
          }));
        }, 50);
      } catch (error: any) {
        resolve(new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }));
      }
    });
  }
}; 