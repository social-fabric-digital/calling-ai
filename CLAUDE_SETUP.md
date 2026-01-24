# Claude API Setup Guide

This guide will help you set up the Anthropic Claude API integration for the chat feature.

## Step 1: Get Your API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy your API key (it starts with `sk-ant-...`)

## Step 2: Set Up Environment Variables

### Option A: Using .env file (Recommended)

1. Create a `.env` file in the root of your project (same level as `package.json`)
2. Add the following line:
   ```
   EXPO_PUBLIC_ANTHROPIC_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with your actual API key from Step 1

### Option B: Using app.json (Alternative)

You can also add it to `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "anthropicApiKey": "your_api_key_here"
    }
  }
}
```

## Step 3: Restart Your Development Server

After adding the API key, restart your Expo development server:

```bash
npx expo start --clear
```

The `--clear` flag ensures the new environment variables are loaded.

## Step 4: Test the Integration

1. Open the app
2. Navigate to the chat screen (click on the deer face on the home screen)
3. Send a message
4. You should receive a response from Claude/Atlas

## Troubleshooting

### "API key is missing or invalid" error

- Make sure your `.env` file is in the root directory
- Ensure the variable name is exactly `EXPO_PUBLIC_ANTHROPIC_API_KEY`
- Restart your development server after adding the key
- Check that your API key is correct and active in the Anthropic console

### API calls not working

- Check your internet connection
- Verify your API key has sufficient credits/quota
- Check the console logs for detailed error messages

## Security Note

⚠️ **Important**: The `EXPO_PUBLIC_` prefix means this variable will be included in your client-side bundle. For production apps, consider:

1. Using a backend API proxy to keep your API key secure
2. Implementing rate limiting
3. Using environment-specific keys

For development and testing, the current setup is fine.

## Support

If you encounter any issues, check:
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)

