package com.teillet.territoire.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {
	private final RoleLoggingInterceptor roleLoggingInterceptor;
	private final ObjectMapper objectMapper;

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(roleLoggingInterceptor);
	}

	@Override
	public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
		int index = -1;
		for (int i = 0; i < converters.size(); i++) {
			if (converters.get(i).getClass().getSimpleName().contains("JacksonJsonHttpMessageConverter")) {
				index = i;
				break;
			}
		}
		if (index >= 0) {
			converters.remove(index);
			converters.add(index, new MappingJackson2HttpMessageConverter(objectMapper));
		} else {
			converters.add(new MappingJackson2HttpMessageConverter(objectMapper));
		}
	}
}
