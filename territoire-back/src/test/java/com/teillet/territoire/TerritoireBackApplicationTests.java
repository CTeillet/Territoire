package com.teillet.territoire;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = "JWT_SECRET_KEY=aaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbxcccccccccccccc")
class TerritoireBackApplicationTests {

	@Test
	void contextLoads() {
	}

}
