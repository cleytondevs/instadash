# Netlify Deployment Guide

This project is configured to be deployed on Netlify with Supabase as the backend.

## Environment Variables

Ensure the following variables are set in your Netlify site settings:

- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key.

## Database Setup

Run the SQL found in `SUPABASE_SETUP.sql` in your Supabase SQL Editor to create the necessary tables.

## Build Settings

- Build command: `npm run build`
- Publish directory: `dist`
