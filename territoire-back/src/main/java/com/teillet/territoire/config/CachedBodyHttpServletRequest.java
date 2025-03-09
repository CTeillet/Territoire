package com.teillet.territoire.config;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.*;

public class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
	private final byte[] cachedBody;

	public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
		super(request);
		InputStream requestInputStream = request.getInputStream();
		this.cachedBody = requestInputStream.readAllBytes();
	}

	@Override
	public ServletInputStream getInputStream() {
		return new CachedBodyServletInputStream(this.cachedBody);
	}

	@Override
	public BufferedReader getReader() {
		return new BufferedReader(new InputStreamReader(getInputStream()));
	}

	private static class CachedBodyServletInputStream extends ServletInputStream {
		private final ByteArrayInputStream inputStream;

		public CachedBodyServletInputStream(byte[] cachedBody) {
			this.inputStream = new ByteArrayInputStream(cachedBody);
		}

		@Override
		public int read() {
			return inputStream.read();
		}

		@Override
		public boolean isFinished() {
			return inputStream.available() == 0;
		}

		@Override
		public boolean isReady() {
			return true;
		}

		@Override
		public void setReadListener(ReadListener readListener) {
			throw new UnsupportedOperationException();
		}
	}
}
