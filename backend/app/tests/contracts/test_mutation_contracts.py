import pytest

from app.main import app

EXPECTED_MUTATION_OPERATIONS = {
    ("PUT", "/api/admin/app-config"),
    ("DELETE", "/api/admin/categories/{category_id}"),
    ("DELETE", "/api/admin/cities/{city_id}"),
    ("DELETE", "/api/admin/guides/{guide_id}"),
    ("DELETE", "/api/admin/guides/{guide_id}/places/{place_id}"),
    ("DELETE", "/api/admin/memories/{memory_id}"),
    ("DELETE", "/api/admin/memories/{memory_id}/audio"),
    ("DELETE", "/api/admin/photos/{photo_id}"),
    ("DELETE", "/api/admin/photos/{photo_id}/audio"),
    ("DELETE", "/api/admin/places/{place_id}"),
    ("DELETE", "/api/admin/reports/{report_id}"),
    ("DELETE", "/api/places/{place_id}/memories/{memory_id}"),
    ("PATCH", "/api/admin/categories/{category_id}"),
    ("PATCH", "/api/admin/cities/{city_id}"),
    ("PATCH", "/api/admin/guides/{guide_id}"),
    ("PATCH", "/api/admin/memories/{memory_id}"),
    ("PATCH", "/api/admin/photos/{photo_id}"),
    ("PATCH", "/api/admin/places/{place_id}"),
    ("PATCH", "/api/admin/reports/{report_id}"),
    ("PATCH", "/api/places/{place_id}/memories/{memory_id}"),
    ("POST", "/api/admin/categories"),
    ("POST", "/api/admin/cities"),
    ("POST", "/api/admin/guides"),
    ("POST", "/api/admin/guides/{guide_id}/places"),
    ("POST", "/api/admin/local-data/orphan-media-cleanup"),
    ("PUT", "/api/admin/guides/{guide_id}/places/order"),
    ("POST", "/api/admin/memories/{memory_id}/redaction"),
    ("POST", "/api/admin/memories/{memory_id}/review"),
    ("POST", "/api/admin/photos/{photo_id}/cover"),
    ("POST", "/api/admin/photos/{photo_id}/redaction"),
    ("POST", "/api/admin/photos/{photo_id}/review"),
    ("POST", "/api/admin/places"),
    ("POST", "/api/admin/places/{place_id}/photos"),
    ("POST", "/api/places/{place_id}/memories"),
    ("POST", "/api/places/{place_id}/memories/{memory_id}/claim"),
    ("POST", "/api/reports"),
    ("PUT", "/api/admin/memories/{memory_id}/audio"),
    ("PUT", "/api/admin/photos/{photo_id}/audio"),
}

ADMIN_MUTATION_PATHS = sorted(
    (method, path) for method, path in EXPECTED_MUTATION_OPERATIONS if path.startswith("/api/admin")
)

PUBLIC_INVALID_MUTATION_REQUESTS = [
    ("POST", "/api/places/missing/memories", {}),
    ("POST", "/api/places/missing/memories/missing/claim", {"claim_token": ""}),
    ("PATCH", "/api/places/missing/memories/missing", {"claim_token": ""}),
    ("DELETE", "/api/places/missing/memories/missing", {"claim_token": ""}),
    ("POST", "/api/reports", {}),
]


def mutation_operations_from_openapi() -> set[tuple[str, str]]:
    schema = app.openapi()
    operations: set[tuple[str, str]] = set()
    for path, path_schema in schema["paths"].items():
        for method in path_schema:
            if method.upper() in {"DELETE", "PATCH", "POST", "PUT"}:
                operations.add((method.upper(), path))
    return operations


def enum_values(schema_part: dict) -> set[str]:
    values = set(schema_part.get("enum", []))
    if "const" in schema_part:
        values.add(schema_part["const"])
    for composition_key in ("anyOf", "oneOf", "allOf"):
        for nested_schema in schema_part.get(composition_key, []):
            values.update(enum_values(nested_schema))
    return {value for value in values if isinstance(value, str)}


def component_property_enum(component: str, property_name: str) -> set[str]:
    schema = app.openapi()
    property_schema = schema["components"]["schemas"][component]["properties"][property_name]
    return enum_values(property_schema)


def component_properties(component: str) -> set[str]:
    schema = app.openapi()
    return set(schema["components"]["schemas"][component]["properties"])


def query_parameter_enum(path: str, parameter_name: str) -> set[str]:
    schema = app.openapi()
    parameters = schema["paths"][path]["get"].get("parameters", [])
    for parameter in parameters:
        if parameter["name"] == parameter_name:
            return enum_values(parameter["schema"])
    raise AssertionError(f"Missing query parameter {parameter_name} for {path}")


def query_parameter(path: str, parameter_name: str) -> dict:
    schema = app.openapi()
    parameters = schema["paths"][path]["get"].get("parameters", [])
    for parameter in parameters:
        if parameter["name"] == parameter_name:
            return parameter
    raise AssertionError(f"Missing query parameter {parameter_name} for {path}")


def response_schema_ref(method: str, path: str, status_code: str) -> str:
    schema = app.openapi()
    response_schema = schema["paths"][path][method.lower()]["responses"][status_code]["content"]["application/json"][
        "schema"
    ]
    return response_schema.get("$ref", "")


def concrete_path(path: str) -> str:
    return (
        path.replace("{category_id}", "missing")
        .replace("{city_id}", "missing")
        .replace("{guide_id}", "missing")
        .replace("{memory_id}", "missing")
        .replace("{photo_id}", "missing")
        .replace("{place_id}", "missing")
        .replace("{report_id}", "missing")
    )


def assert_error_detail_with_request_id(response, detail: str) -> None:
    body = response.json()
    assert body["detail"] == detail
    assert body["request_id"] == response.headers["x-request-id"]
    assert body["request_id"]


def test_openapi_mutation_inventory_is_explicit() -> None:
    assert mutation_operations_from_openapi() == EXPECTED_MUTATION_OPERATIONS


def test_openapi_contract_exposes_domain_enums() -> None:
    active_states = {"active", "archived"}
    publish_states = {"draft", "published", "archived"}
    review_states = {"pending", "approved", "rejected"}
    final_review_states = {"approved", "rejected"}
    guide_kinds = {"collection", "route"}
    report_target_types = {"place", "photo", "memory", "guide"}
    report_reasons = {"wrong_data", "bad_photo", "closed_place", "other"}
    report_states = {"open", "closed"}
    photo_roles = {"gallery"}
    photo_sources = {"editorial"}
    content_block_types = {"heading", "subheading", "paragraph", "link"}
    place_custom_field_types = {"text", "textarea", "number", "select", "url", "boolean", "date"}

    assert component_property_enum("CategoryRead", "status") == active_states
    assert component_property_enum("CategoryCreate", "status") == active_states
    assert component_property_enum("CategoryUpdate", "status") == active_states
    assert component_property_enum("CityRead", "status") == active_states
    assert component_property_enum("CityCreate", "status") == active_states
    assert component_property_enum("CityUpdate", "status") == active_states
    assert component_property_enum("PlaceAdminRead", "status") == publish_states
    assert component_property_enum("PlaceCreate", "status") == publish_states
    assert component_property_enum("PlaceUpdate", "status") == publish_states
    assert component_property_enum("ContentBlock", "type") == content_block_types
    assert component_property_enum("GuideRead", "kind") == guide_kinds
    assert component_property_enum("GuideRead", "status") == publish_states
    assert component_property_enum("GuideCreate", "kind") == guide_kinds
    assert component_property_enum("GuideCreate", "status") == publish_states
    assert component_property_enum("GuideUpdate", "kind") == guide_kinds
    assert component_property_enum("GuideUpdate", "status") == publish_states
    assert component_property_enum("GuidePlacePreviewRead", "status") == publish_states
    assert component_property_enum("PhotoAdminRead", "status") == review_states
    assert component_property_enum("PhotoAdminRead", "role") == photo_roles
    assert component_property_enum("PhotoAdminRead", "source") == photo_sources
    assert component_property_enum("MemoryAdminRead", "status") == review_states
    assert component_property_enum("ReportRead", "target_type") == report_target_types
    assert component_property_enum("ReportRead", "reason") == report_reasons
    assert component_property_enum("ReportRead", "status") == report_states
    assert component_property_enum("ReportCreate", "target_type") == report_target_types
    assert component_property_enum("ReportCreate", "reason") == report_reasons
    assert component_property_enum("ReportUpdate", "status") == report_states
    assert component_property_enum("PhotoReview", "status") == final_review_states
    assert component_property_enum("MemoryReview", "status") == final_review_states
    assert component_property_enum("PlaceMapPhotoPreviewItem", "kind") == {"photo"}
    assert component_property_enum("PlaceMapPhotoRead", "role") == photo_roles
    assert component_property_enum("PlaceMapPhotoRead", "source") == photo_sources
    assert component_property_enum("PlaceMapPhotoPreviewItem", "role") == photo_roles
    assert component_property_enum("PlaceMapPhotoPreviewItem", "source") == photo_sources
    assert component_property_enum("PlaceMapMemoryPreviewItem", "kind") == {"memory"}
    assert component_properties("AudioAttachment") == {
        "duration_seconds",
        "mime_type",
        "public_path",
        "size_bytes",
    }
    assert "audio" in component_properties("PhotoRead")
    assert "audio" in component_properties("MemoryRead")
    assert "audio" in component_properties("PlaceMapPhotoPreviewItem")
    assert "audio" in component_properties("PlaceMapMemoryPreviewItem")
    assert "role" not in component_properties("PlaceMapMemoryPreviewItem")
    assert "source" not in component_properties("PlaceMapMemoryPreviewItem")
    assert component_property_enum("PlaceCustomFieldDefinition", "type") == place_custom_field_types
    assert query_parameter_enum("/api/admin/photos", "status") == review_states
    assert query_parameter_enum("/api/admin/memories", "status") == review_states
    assert query_parameter_enum("/api/admin/reports", "status") == report_states


def test_openapi_contract_keeps_public_payloads_out_of_admin_shape() -> None:
    city_parameter = query_parameter("/api/places/map", "city_id")
    assert city_parameter["in"] == "query"
    assert city_parameter["required"] is False
    assert city_parameter["schema"]["anyOf"] == [{"type": "string", "minLength": 1}, {"type": "null"}]
    assert component_properties("PlaceMapRead") == {
        "categories",
        "category_ids",
        "city",
        "city_id",
        "cover_photo",
        "custom_fields",
        "description",
        "id",
        "lat",
        "lon",
        "memory_count",
        "photo_count",
        "preview_items",
        "score",
        "slug",
        "title",
        "weight",
    }
    for component in ("PlaceRead", "PlaceDetailRead", "PlaceMapRead", "PublicGuidePlacePreviewRead"):
        assert "local_comment" not in component_properties(component)
        assert "status" not in component_properties(component)
    for component in ("PublicGuideRead", "PublicGuideDetailRead"):
        properties = component_properties(component)
        assert "kind" in properties
        assert "status" not in properties
        assert "created_at" not in properties
        assert "updated_at" not in properties

    assert component_properties("PhotoRead") == {
        "audio",
        "attribution_author",
        "attribution_license",
        "attribution_license_url",
        "attribution_source_url",
        "caption",
        "description_blocks",
        "id",
        "place_id",
        "public_path",
        "thumb_path",
    }
    assert component_properties("MemoryRead") == {
        "audio",
        "author_city",
        "author_name",
        "caption",
        "id",
        "memory_text",
        "place_id",
        "public_path",
        "thumb_path",
    }
    assert (
        response_schema_ref("POST", "/api/places/{place_id}/memories", "201")
        == "#/components/schemas/MemorySubmissionRead"
    )
    assert component_properties("MemorySubmissionRead") == {
        "author_city",
        "author_name",
        "caption",
        "created_at",
        "id",
        "memory_text",
        "place_id",
        "status",
    }
    assert "public_path" not in component_properties("MemorySubmissionRead")
    assert "thumb_path" not in component_properties("MemorySubmissionRead")
    assert component_properties("MemoryAdminRead") == {
        "admin_audio",
        "admin_public_path",
        "admin_thumb_path",
        "approved_at",
        "audio",
        "author_city",
        "author_name",
        "caption",
        "consent_confirmed",
        "created_at",
        "id",
        "memory_text",
        "paid",
        "place_id",
        "public_path",
        "share_slug",
        "status",
        "thumb_path",
    }
    assert component_properties("PlaceMapPhotoRead") == {
        "approved_at",
        "audio",
        "attribution_author",
        "attribution_license",
        "attribution_license_url",
        "attribution_source_url",
        "caption",
        "created_at",
        "description_blocks",
        "id",
        "place_id",
        "public_path",
        "role",
        "source",
        "thumb_path",
    }
    assert component_properties("PlaceMapPhotoPreviewItem") == {
        *component_properties("PlaceMapPhotoRead"),
        "kind",
    }
    assert component_properties("PlaceMapMemoryPreviewItem") == {
        "approved_at",
        "audio",
        "caption",
        "created_at",
        "id",
        "kind",
        "place_id",
        "public_path",
        "thumb_path",
    }

    preview_schema = app.openapi()["components"]["schemas"]["PlaceMapRead"]["properties"]["preview_items"]["items"]
    assert preview_schema["discriminator"] == {
        "propertyName": "kind",
        "mapping": {
            "memory": "#/components/schemas/PlaceMapMemoryPreviewItem",
            "photo": "#/components/schemas/PlaceMapPhotoPreviewItem",
        },
    }
    assert preview_schema["oneOf"] == [
        {"$ref": "#/components/schemas/PlaceMapPhotoPreviewItem"},
        {"$ref": "#/components/schemas/PlaceMapMemoryPreviewItem"},
    ]


def test_openapi_contract_exposes_media_redaction_reports() -> None:
    assert (
        response_schema_ref("POST", "/api/admin/photos/{photo_id}/redaction", "200")
        == "#/components/schemas/MediaRedactionReport"
    )
    assert (
        response_schema_ref("POST", "/api/admin/memories/{memory_id}/redaction", "200")
        == "#/components/schemas/MediaRedactionReport"
    )
    assert component_property_enum("MediaRedactionReport", "kind") == {"photo", "memory"}
    assert component_property_enum("MediaRedactionReport", "mode") == {"apply", "dry-run"}
    assert component_property_enum("MediaRedactionReport", "status") == {"ok", "warning", "error"}
    assert component_property_enum("MediaRedactionIssue", "severity") == {"error", "warning", "info"}


@pytest.mark.parametrize(("method", "path"), ADMIN_MUTATION_PATHS)
def test_admin_mutation_contract_requires_bearer_token(client_session, method: str, path: str) -> None:
    client, _session = client_session

    response = client.request(method, concrete_path(path), json={})

    assert response.status_code == 401
    assert_error_detail_with_request_id(response, "Invalid admin token")


@pytest.mark.parametrize(("method", "path", "payload"), PUBLIC_INVALID_MUTATION_REQUESTS)
def test_public_mutation_contract_rejects_invalid_payload_without_server_error(
    client_session,
    method: str,
    path: str,
    payload: dict[str, str],
) -> None:
    client, _session = client_session

    response = client.request(method, path, json=payload)

    assert response.status_code in {404, 422}
