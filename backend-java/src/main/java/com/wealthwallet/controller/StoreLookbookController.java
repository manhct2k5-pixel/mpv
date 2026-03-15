package com.wealthwallet.controller;

import com.wealthwallet.dto.LookbookCreateRequest;
import com.wealthwallet.dto.LookbookResponse;
import com.wealthwallet.dto.LookbookUpdateRequest;
import com.wealthwallet.service.LookbookService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/store/lookbooks")
@RequiredArgsConstructor
public class StoreLookbookController {

    private final LookbookService lookbookService;
    private final UserService userService;

    @GetMapping
    public List<LookbookResponse> lookbooks() {
        return lookbookService.list();
    }

    @GetMapping("/{id}")
    public LookbookResponse lookbook(@PathVariable(name = "id") Long id) {
        return lookbookService.detail(id);
    }

    @PostMapping
    public LookbookResponse create(@Valid @RequestBody LookbookCreateRequest request) {
        return lookbookService.create(userService.getCurrentUser(), request);
    }

    @PutMapping("/{id}")
    public LookbookResponse update(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody LookbookUpdateRequest request
    ) {
        return lookbookService.update(userService.getCurrentUser(), id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable(name = "id") Long id) {
        lookbookService.delete(userService.getCurrentUser(), id);
    }
}
