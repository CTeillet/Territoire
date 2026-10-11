package com.teillet.territoire;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = "JWT_SECRET_KEY=dGVzdF9zZWNyZXRfa2V5X2Zvcl9qd3RfYXV0aGVudGljYXRpb25fdGVzdHNfc3ByaW5nX2Jvb3RfMTIzNDU2Nzg5MA==")
class TerritoireBackApplicationTests {

	@Test
	void contextLoads() {
	}

}
