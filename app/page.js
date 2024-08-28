"use client";

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, CircularProgress } from '@mui/material';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessages),
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      setMessages([...newMessages, { role: 'assistant', content: result }]);
    } catch (err) {
      setError('Failed to fetch response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: 3,
      }}
    >
      <Paper
        sx={{
          width: '60%',
          padding: 4,
          boxShadow: 3,
          borderRadius: 2,
          backgroundColor: '#ffffff',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" color="primary" gutterBottom>
          Rate My Professor Chatbot
        </Typography>
        <Box sx={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: 3 }}>
          {messages.map((message, index) => (
            <Typography
              key={index}
              variant="body1"
              color={message.role === 'assistant' ? 'primary' : 'textSecondary'}
              align={message.role === 'assistant' ? 'left' : 'right'}
              sx={{ margin: 1 }}
            >
              {message.content}
            </Typography>
          ))}
        </Box>
        <TextField
          label="Type your message"
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          sx={{ marginBottom: 3 }}
          aria-label="Type your message"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSend}
          sx={{ padding: 1.5, fontSize: '1rem' }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Send'}
        </Button>
        {error && (
          <Typography variant="body2" color="error" sx={{ marginTop: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
