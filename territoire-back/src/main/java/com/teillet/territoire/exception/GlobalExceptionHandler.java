package com.teillet.territoire.exception;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Gestion centralisée des erreurs de l'API.
 * <p>
 * Les exceptions standard de Spring MVC (validation, paramètre manquant, JSON illisible, 405...) sont traitées
 * par {@link ResponseEntityExceptionHandler}. Les exceptions métier sont traduites ici avec un corps homogène
 * contenant au minimum le champ {@code error} déjà utilisé par le frontend.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler({NotFoundException.class, EntityNotFoundException.class})
	public ResponseEntity<Map<String, Object>> handleNotFound(RuntimeException e, HttpServletRequest request) {
		return build(HttpStatus.NOT_FOUND, e.getMessage(), request);
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException e, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST, e.getMessage(), request);
	}

	@ExceptionHandler(IllegalStateException.class)
	public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException e, HttpServletRequest request) {
		return build(HttpStatus.CONFLICT, e.getMessage(), request);
	}

	@ExceptionHandler(ObjectOptimisticLockingFailureException.class)
	public ResponseEntity<Map<String, Object>> handleOptimisticLock(ObjectOptimisticLockingFailureException e, HttpServletRequest request) {
		log.warn("Conflit de modification concurrente sur {} : {}", request.getRequestURI(), e.getMessage());
		return build(HttpStatus.CONFLICT, "Ce territoire vient d'être modifié par quelqu'un d'autre, rechargez la page et réessayez", request);
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException e, HttpServletRequest request) {
		log.warn("Violation d'intégrité sur {} : {}", request.getRequestURI(), e.getMostSpecificCause().getMessage());
		return build(HttpStatus.CONFLICT,
				"Opération impossible : des données liées existent encore (attributions, territoires, rappels...)", request);
	}

	/**
	 * Doit rester explicite : sans ce handler, le handler générique transformerait les refus
	 * de {@code @PreAuthorize} en erreurs 500.
	 */
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException e, HttpServletRequest request) {
		return build(HttpStatus.FORBIDDEN, "Accès refusé", request);
	}

	@ExceptionHandler(TooManyRequestsException.class)
	public ResponseEntity<Map<String, Object>> handleTooManyRequests(TooManyRequestsException e, HttpServletRequest request) {
		ResponseEntity<Map<String, Object>> base = build(HttpStatus.TOO_MANY_REQUESTS, e.getMessage(), request);
		return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
				.header(HttpHeaders.RETRY_AFTER, String.valueOf(e.getRetryAfterSeconds()))
				.body(base.getBody());
	}

	/**
	 * Erreurs de validation (@Valid) : renvoie les messages des champs dans {@code error} (affichable tel quel)
	 * et le détail par champ dans {@code fields}.
	 */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers,
	                                                              HttpStatusCode status, WebRequest request) {
		Map<String, String> fields = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors()
				.forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
		String message = fields.isEmpty() ? "Requête invalide" : String.join(" ; ", fields.values());

		String path = request instanceof ServletWebRequest servletRequest ? servletRequest.getRequest().getRequestURI() : null;
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("timestamp", OffsetDateTime.now().toString());
		body.put("status", HttpStatus.BAD_REQUEST.value());
		body.put("error", message);
		body.put("fields", fields);
		body.put("path", path);
		return ResponseEntity.badRequest().body(body);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Map<String, Object>> handleUnexpected(Exception e, HttpServletRequest request) {
		log.error("Erreur inattendue sur {} {}", request.getMethod(), request.getRequestURI(), e);
		// Le détail technique reste dans les logs : il n'est pas renvoyé au client
		return build(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne", request);
	}

	private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message, HttpServletRequest request) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("timestamp", OffsetDateTime.now().toString());
		body.put("status", status.value());
		body.put("error", message != null ? message : status.getReasonPhrase());
		body.put("path", request.getRequestURI());
		return ResponseEntity.status(status).body(body);
	}
}
