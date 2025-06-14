# Static Files Organization

This directory contains all static files served by the application.

## Directory Structure

- `/static/pdfs/`: Contains all generated PDF files from checklists
  - These PDFs are accessible via the URL path `/static/pdfs/filename.pdf`

## Previous Structure (Before Reorganization)

Previously, PDF files were stored in multiple locations:
- `/backend/pdfs/`: Main storage for generated PDFs
- `/backend/routes/pdfs/`: Contained template files
- `/backend/static/reports/peppas/ΙΩΑΝΝΙΝΑ/`: Contained other reports

## Changes Made

1. All PDFs are now stored in a single location: `/backend/static/pdfs/`
2. The server configuration has been updated to serve files from `/static/` instead of `/pdfs/`
3. The database has been updated to reflect the new URL paths
4. Old directories have been backed up to `/backend/backup-pdfs/`

## How to Access PDFs

PDFs can be accessed via the URL: `http://localhost:5000/static/pdfs/filename.pdf`
